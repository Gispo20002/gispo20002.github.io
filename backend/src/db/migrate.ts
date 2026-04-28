import { getMasterPool, getPool, sql } from './connection';

async function migrate() {
  console.log('🔄 Avvio migrazione database...');

  // Passo 1: connessione a master per creare il DB se non esiste
  const master = await getMasterPool();
  await master.request().query(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TeslApp')
    CREATE DATABASE TeslApp;
  `);
  await master.close();
  console.log('✅ Database TeslApp pronto');

  // Passo 2: connessione al database TeslApp e creazione tabelle
  const pool = await getPool();

  // Tabella: tokens OAuth
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tokens' AND xtype='U')
    CREATE TABLE tokens (
      id INT IDENTITY PRIMARY KEY,
      access_token NVARCHAR(MAX) NOT NULL,
      refresh_token NVARCHAR(MAX) NOT NULL,
      expires_at DATETIME2 NOT NULL,
      created_at DATETIME2 DEFAULT GETDATE()
    );
  `);

  // Tabella: veicoli
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='vehicles' AND xtype='U')
    CREATE TABLE vehicles (
      id INT IDENTITY PRIMARY KEY,
      tesla_id BIGINT UNIQUE NOT NULL,
      vin NVARCHAR(20) UNIQUE NOT NULL,
      display_name NVARCHAR(100),
      model NVARCHAR(50),
      color NVARCHAR(50),
      created_at DATETIME2 DEFAULT GETDATE()
    );
  `);

  // Tabella: stato veicolo (snapshot ogni 30s)
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='vehicle_states' AND xtype='U')
    CREATE TABLE vehicle_states (
      id INT IDENTITY PRIMARY KEY,
      vehicle_id INT REFERENCES vehicles(id),
      battery_level INT,
      battery_range FLOAT,
      charging_state NVARCHAR(30),
      latitude FLOAT,
      longitude FLOAT,
      speed FLOAT,
      odometer FLOAT,
      locked BIT,
      recorded_at DATETIME2 DEFAULT GETDATE()
    );
  `);

  // Tabella: sessioni di guida
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='drives' AND xtype='U')
    CREATE TABLE drives (
      id INT IDENTITY PRIMARY KEY,
      vehicle_id INT REFERENCES vehicles(id),
      start_time DATETIME2 NOT NULL,
      end_time DATETIME2,
      start_battery INT,
      end_battery INT,
      distance_km FLOAT,
      energy_used_kwh FLOAT,
      max_speed FLOAT,
      avg_speed FLOAT,
      start_lat FLOAT,
      start_lon FLOAT,
      end_lat FLOAT,
      end_lon FLOAT,
      created_at DATETIME2 DEFAULT GETDATE()
    );
  `);

  // Tabella: sessioni di ricarica
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='charge_sessions' AND xtype='U')
    CREATE TABLE charge_sessions (
      id INT IDENTITY PRIMARY KEY,
      vehicle_id INT REFERENCES vehicles(id),
      start_time DATETIME2 NOT NULL,
      end_time DATETIME2,
      start_battery INT,
      end_battery INT,
      energy_added_kwh FLOAT,
      charge_rate_kw FLOAT,
      charger_type NVARCHAR(30),
      location NVARCHAR(200),
      cost_estimate FLOAT,
      created_at DATETIME2 DEFAULT GETDATE()
    );
  `);

  console.log('✅ Migrazione completata!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Errore migrazione:', err);
  process.exit(1);
});
