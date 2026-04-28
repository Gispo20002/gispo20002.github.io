import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

function buildConfig(database?: string): sql.config {
  return {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: database ?? (process.env.DB_NAME || 'TeslApp'),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 30000,
  };
}

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(buildConfig());
    console.log('✅ Connessione SQL Server stabilita');
  }
  return pool;
}

/** Connessione al database master (usata dalla migrazione) */
export async function getMasterPool(): Promise<sql.ConnectionPool> {
  return sql.connect(buildConfig('master'));
}

export { sql };
