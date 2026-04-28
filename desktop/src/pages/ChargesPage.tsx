import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import axios from 'axios';

const API = 'http://localhost:3000';
const COLORS = ['#cc0000', '#3b82f6'];

export default function ChargesPage() {
  const [stats, setStats] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, m, se] = await Promise.all([
        axios.get(`${API}/charges/stats`, { params: { days: 30 } }),
        axios.get(`${API}/charges/monthly`),
        axios.get(`${API}/charges`, { params: { limit: 20 } }),
      ]);
      setStats(s.data); setMonthly(m.data); setSessions(se.data);
    } catch {
      setStats(demoStats); setMonthly(demoMonthly); setSessions(demoSessions);
    }
  }

  const pieData = [
    { name: 'Supercharger', value: stats?.supercharger_sessions ?? 5 },
    { name: 'Casa/AC', value: stats?.home_sessions ?? 13 },
  ];

  const barData = (monthly.length ? monthly : demoMonthly).map(m => ({
    mese: m.month_label ?? `${m.year ?? ''}/${m.month ?? m.mese}`,
    kWh: parseFloat((m.kwh ?? 0).toFixed(1)),
    '€': parseFloat((m.cost ?? 0).toFixed(2)),
  }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ricariche</h1>
        <p className="page-subtitle">Storico e statistiche sessioni di ricarica</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'SESSIONI', value: stats?.total_sessions ?? 0, unit: '', color: '#10b981' },
          { label: 'KWH TOTALI', value: parseFloat(stats?.total_kwh ?? 0).toFixed(0), unit: 'kWh', color: '#f59e0b' },
          { label: 'COSTO STIMATO', value: `€${parseFloat(stats?.total_cost ?? 0).toFixed(0)}`, unit: '30 giorni', color: '#3b82f6' },
          { label: 'VEL. MEDIA', value: parseFloat(stats?.avg_charge_rate ?? 0).toFixed(0), unit: 'kW', color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderTopColor: s.color }}>
            <div className="label">{s.label}</div>
            <div className="value" style={{ color: s.color }}>{s.value}</div>
            <div className="unit">{s.unit}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Grafico kWh mensili */}
        <div className="card">
          <div className="card-label">KWH RICARICATI PER MESE</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis dataKey="mese" tick={{ fill: '#555', fontSize: 11 }} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8 }}
                labelStyle={{ color: '#aaa' }}
              />
              <Bar dataKey="kWh" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Torta tipo ricarica */}
        <div className="card">
          <div className="card-label">TIPO RICARICA</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                dataKey="value" label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8 }}
                labelStyle={{ color: '#aaa' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabella sessioni */}
      <div className="card">
        <div className="card-label">ULTIME SESSIONI DI RICARICA</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th><th>Tipo</th><th>Durata</th>
              <th>Batteria</th><th>kWh aggiunti</th><th>Costo</th>
            </tr>
          </thead>
          <tbody>
            {(sessions.length ? sessions : demoSessions).map((s, i) => (
              <tr key={i}>
                <td>{new Date(s.start_time).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <span className={s.charger_type === 'Supercharger' ? 'badge badge-red' : 'badge badge-blue'}>
                    {s.charger_type === 'Supercharger' ? '⚡ Supercharger' : '🏠 Casa/AC'}
                  </span>
                </td>
                <td>{s.duration_minutes ?? '—'} min</td>
                <td>
                  <span style={{ color: '#f59e0b' }}>{s.start_battery}%</span>
                  {' → '}
                  <span style={{ color: '#10b981' }}>{s.end_battery ?? '—'}%</span>
                </td>
                <td><strong style={{ color: '#10b981' }}>{(s.energy_added_kwh ?? 0).toFixed(1)} kWh</strong></td>
                <td>{s.cost_estimate ? `€${parseFloat(s.cost_estimate).toFixed(2)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const demoStats = {
  total_sessions: 18, total_kwh: 534, total_cost: 96,
  avg_charge_rate: 22, supercharger_sessions: 5, home_sessions: 13,
};
const demoMonthly = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
  return {
    mese: d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
    kwh: Math.floor(Math.random() * 100) + 40,
    cost: Math.floor(Math.random() * 20) + 8,
  };
});
const demoSessions = Array.from({ length: 10 }, (_, i) => ({
  start_time: new Date(Date.now() - i * 3 * 86400000).toISOString(),
  start_battery: Math.floor(Math.random() * 30) + 10,
  end_battery: Math.floor(Math.random() * 20) + 80,
  energy_added_kwh: Math.floor(Math.random() * 40) + 10,
  charger_type: i % 3 === 0 ? 'Supercharger' : 'AC',
  cost_estimate: (Math.random() * 15 + 3).toFixed(2),
  duration_minutes: Math.floor(Math.random() * 90) + 20,
}));
