import { Router, Request, Response } from 'express';
import { getPool, sql } from '../db/connection';
import { teslaService } from '../services/tesla.service';

const router = Router();

// GET /vehicle — info veicolo + ultimo stato
router.get('/', async (_req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        v.id, v.tesla_id, v.vin, v.display_name, v.model,
        vs.battery_level, vs.battery_range, vs.charging_state,
        vs.latitude, vs.longitude, vs.speed, vs.odometer,
        vs.locked, vs.recorded_at
      FROM vehicles v
      LEFT JOIN vehicle_states vs ON vs.id = (
        SELECT TOP 1 id FROM vehicle_states
        WHERE vehicle_id = v.id
        ORDER BY recorded_at DESC
      )
      ORDER BY v.id
    `);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /vehicle/:id/live — dati live direttamente da Tesla
router.get('/:id/live', async (req: Request, res: Response) => {
  try {
    const data = await teslaService.getVehicleData(req.params.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /vehicle/:id/history — storico stati (ultimi N)
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const limit = parseInt(req.query.limit as string) || 100;
    const hours = parseInt(req.query.hours as string) || 24;

    const result = await pool.request()
      .input('vid', sql.Int, req.params.id)
      .input('limit', sql.Int, limit)
      .input('hours', sql.Int, hours)
      .query(`
        SELECT TOP (@limit)
          battery_level, battery_range, charging_state,
          latitude, longitude, speed, odometer, recorded_at
        FROM vehicle_states
        WHERE vehicle_id = @vid
          AND recorded_at >= DATEADD(HOUR, -@hours, GETDATE())
        ORDER BY recorded_at DESC
      `);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /vehicle/:id/wake — sveglia il veicolo
router.post('/:id/wake', async (req: Request, res: Response) => {
  try {
    await teslaService.wakeUp(req.params.id);
    res.json({ message: 'Veicolo svegliato' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
