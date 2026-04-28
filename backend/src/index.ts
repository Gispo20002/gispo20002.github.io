import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

import { getPool } from './db/connection';
import { startScheduler } from './services/scheduler';
import authRoutes from './routes/auth.routes';
import vehicleRoutes from './routes/vehicle.routes';
import drivesRoutes from './routes/drives.routes';
import chargesRoutes from './routes/charges.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/vehicle', vehicleRoutes);
app.use('/drives', drivesRoutes);
app.use('/charges', chargesRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Demo data endpoint (per testing senza Tesla reale)
app.get('/demo/vehicle', (_req, res) => {
  res.json({
    id: 1,
    display_name: 'Tesla Demo',
    model: 'Model 3',
    vin: 'DEMO123456789',
    battery_level: 78,
    battery_range: 280.5,
    charging_state: 'Disconnected',
    latitude: 41.9028,
    longitude: 12.4964,
    speed: 0,
    odometer: 15420.3,
    locked: true,
    recorded_at: new Date().toISOString(),
  });
});

// WebSocket per aggiornamenti live
const wss = new WebSocketServer({ server });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`📡 Client WebSocket connesso (totale: ${clients.size})`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`📡 Client disconnesso (totale: ${clients.size})`);
  });
});

export function broadcastVehicleUpdate(data: any) {
  const message = JSON.stringify({ type: 'VEHICLE_UPDATE', data });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Avvio HTTP subito — il DB viene connesso in background con retry
server.listen(PORT, () => {
  console.log(`🚀 TeslApp Backend in ascolto su http://localhost:${PORT}`);
  console.log(`📡 WebSocket attivo su ws://localhost:${PORT}`);
});

async function connectWithRetry(attempts = 0): Promise<void> {
  try {
    await getPool();
    console.log('✅ Database connesso');
    startScheduler();
  } catch (err: any) {
    const wait = Math.min(5000 * (attempts + 1), 30000);
    console.warn(`⏳ DB non raggiungibile (tentativo ${attempts + 1}), riprovo tra ${wait / 1000}s...`);
    setTimeout(() => connectWithRetry(attempts + 1), wait);
  }
}

connectWithRetry();
