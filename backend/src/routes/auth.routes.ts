import { Router, Request, Response } from 'express';
import { teslaService } from '../services/tesla.service';
import { getPool, sql } from '../db/connection';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

// POST /auth/register-partner — registra su NA + EU, mostra risultato per ogni regione
router.post('/register-partner', async (req: Request, res: Response) => {
  const domain = req.body?.domain;
  if (!domain) return res.status(400).json({ error: 'Campo "domain" obbligatorio' });

  const result = await teslaService.registerPartner(domain);
  console.log('📋 Risultato registrazione:', JSON.stringify(result, null, 2));

  const euOk = !result.EU?.error;
  const naOk = !result.NA?.error;

  res.status(euOk ? 200 : 500).json({
    na: naOk ? '✅ OK' : `❌ ${JSON.stringify(result.NA?.error)}`,
    eu: euOk ? '✅ OK' : `❌ ${JSON.stringify(result.EU?.error)}`,
    raw: result,
  });
});

// GET /auth/login — reindirizza a Tesla OAuth
router.get('/login', (_req: Request, res: Response) => {
  const url = teslaService.getAuthUrl();
  res.redirect(url);
});

// GET /auth/callback — Tesla reindirizza qui dopo il login
router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Codice mancante' });

  try {
    await teslaService.exchangeCode(code as string);

    // Recupera e salva i veicoli
    const vehicles = await teslaService.getVehicles();
    const pool = await getPool();

    for (const v of vehicles) {
      await pool.request()
        .input('tid', sql.BigInt, v.id)
        .input('vin', sql.NVarChar(20), v.vin)
        .input('name', sql.NVarChar(100), v.display_name)
        .input('model', sql.NVarChar(50), v.vehicle_config?.car_type ?? 'Unknown')
        .query(`
          IF NOT EXISTS (SELECT 1 FROM vehicles WHERE tesla_id = @tid)
          INSERT INTO vehicles (tesla_id, vin, display_name, model)
          VALUES (@tid, @vin, @name, @model)
        `);
    }

    // Crea un JWT interno per l'app mobile
    const token = jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: '30d' });

    const vehicleNames = vehicles.map((v: any) => v.display_name).join(', ');

    // Pagina di successo — funziona nel browser, passa il token all'app mobile via deep link
    res.send(`<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TeslApp — Accesso riuscito</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f1117; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1a1f2e; border: 1px solid #2a3040; border-radius: 20px; padding: 48px 40px;
            max-width: 480px; width: 90%; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 8px; }
    .vehicle { color: #10b981; font-size: 18px; font-weight: 600; margin: 16px 0; }
    p { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
    .token-box { background: #0f1117; border: 1px solid #2a3040; border-radius: 10px;
                 padding: 12px 16px; font-family: monospace; font-size: 11px; color: #888;
                 word-break: break-all; text-align: left; margin: 16px 0; }
    .btn { display: inline-block; background: #cc0000; color: #fff; text-decoration: none;
           padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; margin-top: 8px; }
    .links { margin-top: 24px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .link { color: #3b82f6; text-decoration: none; font-size: 13px; }
    .link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚡</div>
    <h1>Autenticazione riuscita!</h1>
    <div class="vehicle">🚗 ${vehicleNames || 'Veicolo collegato'}</div>
    <p>I tuoi dati Tesla vengono ora sincronizzati nel database. Il backend ha iniziato il polling automatico ogni 30 secondi.</p>

    <p style="color:#aaa; margin-top:16px; font-size:13px;">Token per l'app mobile (copia in <code style="color:#f59e0b">mobile/src/api/client.ts</code>):</p>
    <div class="token-box">${token}</div>

    <div class="links">
      <a class="link" href="/vehicle" target="_blank">📊 Vedi dati veicolo</a>
      <a class="link" href="/auth/status" target="_blank">🔐 Stato auth</a>
      <a class="link" href="/drives/stats" target="_blank">🚗 Stats guida</a>
      <a class="link" href="/charges/stats" target="_blank">⚡ Stats ricariche</a>
    </div>
  </div>

  <script>
    // Prova ad aprire il deep link per l'app mobile (se installata)
    setTimeout(() => {
      window.location.href = 'teslapp://auth?token=${token}&status=success';
    }, 2000);
  </script>
</body>
</html>`);
  } catch (err: any) {
    const detail = err.response?.data ?? err.message ?? err;
    console.error('❌ Errore callback auth:', JSON.stringify(detail, null, 2));
    res.status(500).send(`<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><title>TeslApp — Errore</title>
<style>body{background:#0f1117;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;
justify-content:center;min-height:100vh;} .card{background:#1a1f2e;border:1px solid #cc0000;
border-radius:20px;padding:40px;max-width:500px;width:90%;} pre{color:#ff8888;font-size:12px;
overflow:auto;margin-top:16px;}</style></head>
<body><div class="card"><h1 style="color:#ff4444">❌ Autenticazione fallita</h1>
<pre>${JSON.stringify(detail, null, 2)}</pre></div></body></html>`);
  }
});

// POST /auth/logout
router.post('/logout', async (_req: Request, res: Response) => {
  const pool = await getPool();
  await pool.request().query(`DELETE FROM tokens`);
  res.json({ message: 'Logout effettuato' });
});

// GET /auth/status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 1 expires_at FROM tokens ORDER BY id DESC
    `);
    const authenticated = result.recordset.length > 0;
    res.json({ authenticated });
  } catch {
    res.json({ authenticated: false });
  }
});

export default router;
