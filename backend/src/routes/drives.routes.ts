import { Router, Request, Response } from 'express';
import { getPool, sql } from '../db/connection';

const router = Router();

// GET /drives — lista sessioni di guida
router.get('/', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const limit = parseInt(req.query.limit as string) || 50;
    const vehicleId = req.query.vehicle_id;

    let query = `
      SELECT TOP (@limit)
        d.id, d.vehicle_id, v.display_name,
        d.start_time, d.end_time,
        d.start_battery, d.end_battery,
        d.distance_km, d.energy_used_kwh,
        d.max_speed, d.avg_speed,
        d.start_lat, d.start_lon, d.end_lat, d.end_lon,
        DATEDIFF(MINUTE, d.start_time, ISNULL(d.end_time, GETDATE())) as duration_minutes
      FROM drives d
      JOIN vehicles v ON v.id = d.vehicle_id
    `;

    if (vehicleId) {
      query += ` WHERE d.vehicle_id = @vid `;
    }

    query += ` ORDER BY d.start_time DESC`;

    const req2 = pool.request().input('limit', sql.Int, limit);
    if (vehicleId) req2.input('vid', sql.Int, vehicleId);

    const result = await req2.query(query);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /drives/stats — statistiche aggregate
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const days = parseInt(req.query.days as string) || 30;

    const result = await pool.request()
      .input('days', sql.Int, days)
      .query(`
        SELECT
          COUNT(*) as total_drives,
          ISNULL(SUM(distance_km), 0) as total_km,
          ISNULL(SUM(energy_used_kwh), 0) as total_kwh,
          ISNULL(AVG(avg_speed), 0) as avg_speed,
          ISNULL(MAX(max_speed), 0) as max_speed_ever,
          ISNULL(SUM(DATEDIFF(MINUTE, start_time, ISNULL(end_time, GETDATE()))), 0) as total_minutes
        FROM drives
        WHERE start_time >= DATEADD(DAY, -@days, GETDATE())
          AND end_time IS NOT NULL
      `);
    res.json(result.recordset[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /drives/daily — km per giorno (per grafici)
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const days = parseInt(req.query.days as string) || 30;

    const result = await pool.request()
      .input('days', sql.Int, days)
      .query(`
        SELECT
          CAST(start_time AS DATE) as date,
          COUNT(*) as drives,
          ISNULL(SUM(distance_km), 0) as km,
          ISNULL(SUM(energy_used_kwh), 0) as kwh
        FROM drives
        WHERE start_time >= DATEADD(DAY, -@days, GETDATE())
          AND end_time IS NOT NULL
        GROUP BY CAST(start_time AS DATE)
        ORDER BY date ASC
      `);
    res.json(result.recordset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
