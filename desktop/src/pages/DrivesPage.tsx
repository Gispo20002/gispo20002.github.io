import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import axios from 'axios';

const API = 'http://localhost:3000';

export default function DrivesPage() {
  const [stats, setStats] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, d, dr] = await Promise.all([
        axios.get(`${API}/drives/stats`, { params: { days: 30 } }),
        axios.get(`${API}/drives/daily`, { params: { days: 30 } }),
        axios.get(`${API}/drives`, { params: { limit: 20 } }),
      ]);
      setStats(s.data); setDaily(d.data); setDrives(dr.data);
    } catch {
      setStats(demoStats); setDaily(demoDaily); setDrives(demoDrives);
    }
  }

  const chartData = (daily.length ? daily : demoDaily).map(d => ({
    data: new Date(d.date ?? d.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
    km: parseFloat((d.km ?? 0).toFixed(1)),
    kWh: parseFloat((d.kwh ?? 0).toFixed(1)),
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Percorsi</h1>
        <p className="page-subtitle">Statistiche guida degli ultimi 30 giorni</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'PERCORSI', value: stats?.total_drives ?? 0, unit: '', color: '#3b82f6' },
          { label: 'KM TOTALI', value: parseFloat(stats?.total_km ?? 0).toFixed(0), unit: 'km', color: '#10b981' },
          { label: 'ENERGIA USATA', value: parseFloat(stats?.total_kwh ?? 0).toFixed(0), unit: 'kWh', color: '#f59e0b' },
          { label: 'VEL. MAX', value: parseFloat(stats?.max_speed_ever ?? 0).toFixed(0), unit: 'km/h', color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderTopColor: s.color }}>
            <div className="label">{s.label}</div>
            <div className="value" style={{ color: s.color }}>{s.value}</div>
            <div className="unit">{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Grafico km + kWh giornalieri */}
      <div className="card">
        <div className="card-label">KM E CONSUMO GIORNALIERO (30 GIORNI)</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
            <XAxis dataKey="data" tick={{ fill: '#555', fontSize: 10 }} interval={4} />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8 }}
              labelStyle={{ color: '#aaa' }}
            />
            <Legend wrapperStyle={{ color: '#666', fontSize: 12 }} />
            <Bar dataKey="km" fill="#cc0000" radius={[4, 4, 0, 0]} name="Km" />
            <Bar dataKey="kWh" fill="#3b82f6" radius={[4, 4, 0, 0]} name="kWh" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabella percorsi */}
      <div className="card">
        <div className="card-label">ULTIMI PERCORSI</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th><th>Partenza</th><th>Durata</th>
              <th>Distanza</th><th>Energia</th><th>Vel. media</th>
            </tr>
          </thead>
          <tbody>
            {(drives.length ? drives : demoDrives).map((d, i) => (
              <tr key={i}>
                <td>{new Date(d.start_time).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td>{d.start_lat && d.start_lon
                  ? `${parseFloat(d.start_lat).toFixed(3)}, ${parseFloat(d.start_lon).toFixed(3)}`
                  : '—'}</td>
                <td>{d.duration_minutes ?? '—'} min</td>
                <td><strong style={{ color: '#10b981' }}>{(d.distance_km ?? 0).toFixed(1)} km</strong></td>
                <td>{(d.energy_used_kwh ?? 0).toFixed(1)} kWh</td>
                <td>{(d.avg_speed ?? 0).toFixed(0)} km/h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const demoStats = {
  total_drives: 24, total_km: 842, total_kwh: 148, max_speed_ever: 142,
};
const demoDaily = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
  km: Math.floor(Math.random() * 80) + 5,
  kwh: Math.floor(Math.random() * 15) + 2,
}));
const demoDrives = Array.from({ length: 10 }, (_, i) => ({
  start_time: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  distance_km: Math.floor(Math.random() * 60) + 5,
  energy_used_kwh: Math.floor(Math.random() * 12) + 1,
  avg_speed: Math.floor(Math.random() * 40) + 45,
  duration_minutes: Math.floor(Math.random() * 60) + 10,
  start_lat: 41.9028 + Math.random() * 0.1,
  start_lon: 12.4964 + Math.random() * 0.1,
}));
