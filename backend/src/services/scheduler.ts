import cron from 'node-cron';
import { teslaService } from './tesla.service';
import { getPool, sql } from '../db/connection';

let isPolling = false;

async function pollVehicleData() {
  if (isPolling) return;
  isPolling = true;

  try {
    const pool = await getPool();

    // Prendi tutti i veicoli registrati
    const vehicles = await pool.request().query(`SELECT id, tesla_id FROM vehicles`);
    if (vehicles.recordset.length === 0) return;

    for (const vehicle of vehicles.recordset) {
      try {
        const data = await teslaService.getVehicleData(vehicle.tesla_id.toString());
        await teslaService.saveVehicleState(vehicle.id, data);

        const ds = data.drive_state;
        const cs = data.charge_state;
        const isDriving = ds?.shift_state && ['D', 'R', 'N'].includes(ds.shift_state);
        const isCharging = cs?.charging_state === 'Charging';

        // Sessioni di guida
        if (isDriving) {
          await handleDriveSession(vehicle.id, data);
        } else {
          await closeDriveSession(vehicle.id, data);
        }

        // Sessioni di ricarica
        if (isCharging) {
          await handleChargeSession(vehicle.id, data);
        } else {
          await closeChargeSession(vehicle.id, data);
        }

      } catch (vehicleErr) {
        console.error(`❌ Errore polling veicolo ${vehicle.tesla_id}:`, vehicleErr);
      }
    }
  } catch (err) {
    console.error('❌ Errore scheduler:', err);
  } finally {
    isPolling = false;
  }
}

function resolveChargerType(cs: any): string {
  if (!cs) return 'AC';
  const fct = cs.fast_charger_type as string | null;
  if (!fct) return 'AC';
  if (fct === 'Tesla') return 'Supercharger';
  if (['CCS', 'CHAdeMO', 'MCSingleWirePCS'].includes(fct)) return 'DC';
  return fct;
}

async function handleDriveSession(vehicleId: number, data: any) {
  const pool = await getPool();
  const ds = data.drive_state;
  const cs = data.charge_state;

  const open = await pool.request()
    .input('vid', sql.Int, vehicleId)
    .query(`SELECT id FROM drives WHERE vehicle_id = @vid AND end_time IS NULL`);

  if (open.recordset.length === 0) {
    // Apri nuova sessione di guida
    await pool.request()
      .input('vid', sql.Int, vehicleId)
      .input('start_bat', sql.Int, cs?.battery_level ?? null)
      .input('slat', sql.Float, ds?.latitude ?? null)
      .input('slon', sql.Float, ds?.longitude ?? null)
      .query(`
        INSERT INTO drives (vehicle_id, start_time, start_battery, start_lat, start_lon)
        VALUES (@vid, GETDATE(), @start_bat, @slat, @slon)
      `);
  }
}

async function closeDriveSession(vehicleId: number, data: any) {
  const pool = await getPool();
  const ds = data.drive_state;
  const cs = data.charge_state;
  const vs = data.vehicle_state;

  await pool.request()
    .input('vid', sql.Int, vehicleId)
    .input('end_bat', sql.Int, cs?.battery_level ?? null)
    .input('elat', sql.Float, ds?.latitude ?? null)
    .input('elon', sql.Float, ds?.longitude ?? null)
    .input('odo', sql.Float, vs?.odometer ?? null)
    .query(`
      UPDATE drives
      SET end_time = GETDATE(),
          end_battery = @end_bat,
          end_lat = @elat,
          end_lon = @elon
      WHERE vehicle_id = @vid AND end_time IS NULL
    `);
}

async function handleChargeSession(vehicleId: number, data: any) {
  const pool = await getPool();
  const cs = data.charge_state;

  const open = await pool.request()
    .input('vid', sql.Int, vehicleId)
    .query(`SELECT id FROM charge_sessions WHERE vehicle_id = @vid AND end_time IS NULL`);

  if (open.recordset.length === 0) {
    // Apri nuova sessione di ricarica
    await pool.request()
      .input('vid', sql.Int, vehicleId)
      .input('start_bat', sql.Int, cs?.battery_level ?? null)
      .input('rate', sql.Float, cs?.charger_power ?? null)
      .input('type', sql.NVarChar(30), resolveChargerType(cs))
      .query(`
        INSERT INTO charge_sessions (vehicle_id, start_time, start_battery, charge_rate_kw, charger_type)
        VALUES (@vid, GETDATE(), @start_bat, @rate, @type)
      `);
  }
}

async function closeChargeSession(vehicleId: number, data: any) {
  const pool = await getPool();
  const cs = data.charge_state;

  await pool.request()
    .input('vid', sql.Int, vehicleId)
    .input('end_bat', sql.Int, cs?.battery_level ?? null)
    .input('kwh', sql.Float, cs?.charge_energy_added ?? null)
    .query(`
      UPDATE charge_sessions
      SET end_time = GETDATE(),
          end_battery = @end_bat,
          energy_added_kwh = @kwh
      WHERE vehicle_id = @vid AND end_time IS NULL
    `);
}

export function startScheduler() {
  // Polling ogni 30 secondi
  cron.schedule('*/30 * * * * *', async () => {
    await pollVehicleData();
  });

  console.log('🕐 Scheduler avviato — polling ogni 30 secondi');
}
