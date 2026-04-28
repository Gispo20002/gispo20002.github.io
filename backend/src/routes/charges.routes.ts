import { Router, Request, Response } from 'express';
import { getPool, sql } from '../db/connection';

const router = Router();

// GET /charges — lista sessioni di ricarica
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          cs.id, cs.vehicle_id, v.display_name,
          cs.start_time, cs.end_time,
          cs.start_battery, cs.end_battery,
          cs.energy_added_kwh, cs.charge_rate_kw,
          cs.charger_type, cs.location, cs.cost_estimate,
          DATEDIFF(MINUTE, cs.start_time, ISNULL(cs.end_time, GETDATE())) as duration_minutes
        FROM charge_sessions cs
        JOIN vehicles v ON v.id = cs.vehicle_id
        ORDER BY cs.start_time DESC
      `);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /charges/stats — statistiche ricarica
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const days = parseInt(req.query.days as string) || 30;

    const result = await pool.request()
      .input('days', sql.Int, days)
      .query(`
        SELECT
          COUNT(*) as total_sessions,
          ISNULL(SUM(energy_added_kwh), 0) as total_kwh,
          ISNULL(AVG(energy_added_kwh), 0) as avg_kwh_per_session,
          ISNULL(SUM(cost_estimate), 0) as total_cost,
          ISNULL(AVG(charge_rate_kw), 0) as avg_charge_rate,
          SUM(CASE WHEN charger_type = 'Supercharger' THEN 1 ELSE 0 END) as supercharger_sessions,
          SUM(CASE WHEN charger_type != 'Supercharger' THEN 1 ELSE 0 END) as home_sessions
        FROM charge_sessions
        WHERE start_time >= DATEADD(DAY, -@days, GETDATE())
          AND end_time IS NOT NULL
      `);
    res.json(result.recordset[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /charges/monthly — kWh per mese
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        YEAR(start_time) as year,
        MONTH(start_time) as month,
        COUNT(*) as sessions,
        ISNULL(SUM(energy_added_kwh), 0) as kwh,
        ISNULL(SUM(cost_estimate), 0) as cost
      FROM charge_sessions
      WHERE end_time IS NOT NULL
        AND start_time >= DATEADD(MONTH, -12, GETDATE())
      GROUP BY YEAR(start_time), MONTH(start_time)
      ORDER BY year ASC, month ASC
    `);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
