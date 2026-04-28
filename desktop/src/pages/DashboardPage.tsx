import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import axios from 'axios';

const API = 'http://localhost:3000';

interface VehicleState {
  display_name: string; model: string; vin: string;
  battery_level: number; battery_range: number; charging_state: string;
  speed: number; odometer: number; locked: boolean; recorded_at: string;
}

export default function DashboardPage() {
  const [vehicle, setVehicle] = useState<VehicleState | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      try {
        const res = await axios.get(`${API}/vehicle`);
        if (res.data.length > 0) {
          setVehicle(res.data[0]);
          const hRes = await axios.get(`${API}/vehicle/${res.data[0].id}/history`, {
            params: { hours: 12, limit: 50 },
          });
          setHistory(hRes.data.reverse());
          setLoading(false);
          return;
        }
      } catch {}
      // Demo
      const demo = await axios.get(`${API}/demo/vehicle`);
      setVehicle(demo.data);
      setHistory(generateDemoHistory());
    } catch {}
    setLoading(false);
  }

  const batteryColor = !vehicle ? '#666'
    : vehicle.battery_level > 50 ? '#10b981'
    : vehicle.battery_level > 20 ? '#f59e0b' : '#ef4444';

  const chargingLabel: Record<string, string> = {
    Charging: '⚡ In ricarica', Complete: '✅ Completa',
    Disconnected: '🔌 Disconnesso', Stopped: '⏸ Fermata',
  };

  const chartData = history.map(h => ({
    time: new Date(h.recorded_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    battery: h.battery_level,
    range: parseFloat((h.battery_range ?? 0).toFixed(1)),
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{vehicle?.display_name ?? 'Tesla'}</h1>
        <p className="page-subtitle">{vehicle?.model ?? '—'} · VIN: {vehicle?.vin ?? '—'}</p>
      </div>

      {/* Stats principali */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderTopColor: batteryColor }}>
          <div className="label">BATTERIA</div>
          <div className="value" style={{ color: batteryColor }}>{vehicle?.battery_level ?? '—'}%</div>
          <div className="battery-wrap">
            <div className="battery-bar-bg">
              <div className="battery-bar-fill" style={{
                width: `${vehicle?.battery_level ?? 0}%`,
                backgroundColor: batteryColor,
              }} />
            </div>
          </div>
          <div className="unit">{vehicle?.battery_range?.toFixed(0) ?? '—'} km autonomia</div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#3b82f6' }}>
          <div className="label">STATO RICARICA</div>
          <div className="value" style={{ color: '#3b82f6', fontSize: 20, marginTop: 16 }}>
            {chargingLabel[vehicle?.charging_state ?? ''] ?? vehicle?.charging_state ?? '—'}
          </div>
        </div>

        <div className="stat-card" style={{ borderTopColor: '#8b5cf6' }}>
          <div className="label">ODOMETRO</div>
          <div className="value" style={{ color: '#8b5cf6' }}>
            {vehicle?.odometer ? (vehicle.odometer / 1.609).toFixed(0) : '—'}
          </div>
          <div className="unit">km totali</div>
        </div>

        <div className="stat-card" style={{ borderTopColor: vehicle?.locked ? '#10b981' : '#f59e0b' }}>
          <div className="label">STATO</div>
          <div className="value" style={{ color: vehicle?.locked ? '#10b981' : '#f59e0b', fontSize: 20, marginTop: 16 }}>
            {vehicle?.locked ? '🔒 Bloccata' : '🔓 Sbloccata'}
          </div>
        </div>
      </div>

      {/* Grafico batteria nelle ultime ore */}
      <div className="card">
        <div className="card-label">ANDAMENTO BATTERIA — ULTIME 12 ORE</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
            <XAxis dataKey="time" tick={{ fill: '#555', fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fill: '#555', fontSize: 11 }} unit="%" />
            <Tooltip
              contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8 }}
              labelStyle={{ color: '#aaa' }}
              itemStyle={{ color: '#10b981' }}
            />
            <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '20%', fill: '#ef4444', fontSize: 10 }} />
            <Line
              type="monotone" dataKey="battery"
              stroke={batteryColor} strokeWidth={2.5}
              dot={false} name="Batteria %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Info aggiornamento */}
      <p style={{ color: '#333', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
        Aggiornamento automatico ogni 30s · Ultimo:{' '}
        {vehicle?.recorded_at ? new Date(vehicle.recorded_at).toLocaleTimeString('it-IT') : '—'}
      </p>
    </div>
  );
}

function generateDemoHistory() {
  return Array.from({ length: 24 }, (_, i) => ({
    recorded_at: new Date(Date.now() - (23 - i) * 30 * 60000).toISOString(),
    battery_level: Math.max(10, 80 - i * 1.5 + (Math.random() - 0.5) * 3),
    battery_range: Math.max(30, 290 - i * 5 + (Math.random() - 0.5) * 8),
  }));
}
