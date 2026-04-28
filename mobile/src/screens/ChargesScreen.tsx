import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryPie } from 'victory-native';
import { ChargesAPI } from '../api/client';

interface ChargeStats {
  total_sessions: number;
  total_kwh: number;
  avg_kwh_per_session: number;
  total_cost: number;
  avg_charge_rate: number;
  supercharger_sessions: number;
  home_sessions: number;
}

export default function ChargesScreen() {
  const [stats, setStats] = useState<ChargeStats | null>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const demoStats: ChargeStats = {
    total_sessions: 18, total_kwh: 534.2, avg_kwh_per_session: 29.7,
    total_cost: 96.5, avg_charge_rate: 22, supercharger_sessions: 5, home_sessions: 13,
  };
  const demoMonthly = Array.from({ length: 6 }, (_, i) => ({
    month: new Date(Date.now() - (5 - i) * 30 * 86400000).toLocaleDateString('it-IT', { month: 'short' }),
    kwh: Math.floor(Math.random() * 100) + 30,
    cost: Math.floor(Math.random() * 20) + 8,
  }));

  useEffect(() => {
    async function load() {
      try {
        const [s, m, se] = await Promise.all([
          ChargesAPI.getStats(30),
          ChargesAPI.getMonthly(),
          ChargesAPI.getAll(8),
        ]);
        setStats(s.data);
        setMonthly(m.data);
        setSessions(se.data);
      } catch {
        setStats(demoStats);
        setMonthly(demoMonthly);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#cc0000" />
      </View>
    );
  }

  const monthlyData = (monthly.length > 0 ? monthly : demoMonthly).map((m, i) => ({
    x: i + 1, y: m.kwh ?? m.kwh,
  }));

  const totalSessions = (stats?.supercharger_sessions ?? 0) + (stats?.home_sessions ?? 0);
  const pieData = [
    { x: 'Supercharger', y: stats?.supercharger_sessions ?? 5, label: 'Supercharger' },
    { x: 'Casa/AC', y: stats?.home_sessions ?? 13, label: 'Casa/AC' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>ULTIMI 30 GIORNI</Text>

      {/* Stats principali */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { borderTopColor: '#10b981' }]}>
          <Text style={styles.statLabel}>Sessioni</Text>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats?.total_sessions ?? 0}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#f59e0b' }]}>
          <Text style={styles.statLabel}>Totale kWh</Text>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats?.total_kwh.toFixed(0) ?? 0}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#3b82f6' }]}>
          <Text style={styles.statLabel}>Costo stimato</Text>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>€{stats?.total_cost.toFixed(0) ?? 0}</Text>
        </View>
        <View style={[styles.statBox, { borderTopColor: '#8b5cf6' }]}>
          <Text style={styles.statLabel}>Vel. media</Text>
          <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{stats?.avg_charge_rate.toFixed(0) ?? 0} kW</Text>
        </View>
      </View>

      {/* Grafico kWh mensili */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>KWH PER MESE</Text>
        <VictoryChart
          theme={VictoryTheme.material}
          height={200}
          padding={{ left: 50, right: 20, top: 20, bottom: 40 }}
        >
          <VictoryAxis
            tickValues={monthlyData.map(d => d.x)}
            tickFormat={(monthly.length > 0 ? monthly : demoMonthly).map(m => m.month)}
            style={{ tickLabels: { fill: '#666', fontSize: 10 }, axis: { stroke: '#2a3040' }, grid: { stroke: 'transparent' } }}
          />
          <VictoryAxis
            dependentAxis
            style={{ tickLabels: { fill: '#666', fontSize: 10 }, axis: { stroke: '#2a3040' }, grid: { stroke: '#1e2530' } }}
          />
          <VictoryBar
            data={monthlyData}
            style={{ data: { fill: '#10b981' } }}
            cornerRadius={{ top: 4 }}
          />
        </VictoryChart>
      </View>

      {/* Torta tipo ricarica */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>TIPO RICARICA</Text>
        <View style={styles.pieRow}>
          <VictoryPie
            data={pieData}
            width={180} height={180}
            colorScale={['#cc0000', '#3b82f6']}
            innerRadius={50}
            labels={() => ''}
            padding={10}
          />
          <View style={styles.pieLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#cc0000' }]} />
              <Text style={styles.legendText}>
                Supercharger{'\n'}{stats?.supercharger_sessions ?? 5} sessioni
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendText}>
                Casa / AC{'\n'}{stats?.home_sessions ?? 13} sessioni
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Lista sessioni recenti */}
      <Text style={styles.sectionTitle}>ULTIME RICARICHE</Text>
      {(sessions.length > 0 ? sessions : demoSessions).map((s, i) => (
        <View key={i} style={styles.sessionRow}>
          <View style={[styles.chargerBadge, {
            backgroundColor: s.charger_type === 'Supercharger' ? '#cc000020' : '#3b82f620',
          }]}>
            <Text style={[styles.chargerBadgeText, {
              color: s.charger_type === 'Supercharger' ? '#cc0000' : '#3b82f6',
            }]}>
              {s.charger_type === 'Supercharger' ? '⚡ SC' : '🏠 AC'}
            </Text>
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDate}>
              {new Date(s.start_time).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
            </Text>
            <Text style={styles.sessionSub}>
              {s.start_battery}% → {s.end_battery ?? '100'}%
            </Text>
          </View>
          <View style={styles.sessionRight}>
            <Text style={styles.sessionKwh}>{(s.energy_added_kwh ?? 0).toFixed(1)} kWh</Text>
            <Text style={styles.sessionCost}>
              {s.cost_estimate ? `€${s.cost_estimate.toFixed(2)}` : '—'}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const demoSessions = Array.from({ length: 5 }, (_, i) => ({
  start_time: new Date(Date.now() - i * 3 * 86400000).toISOString(),
  start_battery: Math.floor(Math.random() * 30) + 15,
  end_battery: Math.floor(Math.random() * 20) + 80,
  energy_added_kwh: Math.floor(Math.random() * 40) + 10,
  charger_type: i % 3 === 0 ? 'Supercharger' : 'AC',
  cost_estimate: Math.random() * 15 + 3,
  duration_minutes: Math.floor(Math.random() * 90) + 20,
}));

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1117' },
  sectionTitle: {
    color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginHorizontal: 16, marginTop: 24, marginBottom: 12,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statBox: {
    width: '47%', padding: 16, backgroundColor: '#1a1f2e',
    borderRadius: 12, borderTopWidth: 3, borderWidth: 1, borderColor: '#2a3040',
  },
  statLabel: { color: '#666', fontSize: 11, fontWeight: '600' },
  statValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  card: {
    margin: 16, padding: 16, backgroundColor: '#1a1f2e',
    borderRadius: 16, borderWidth: 1, borderColor: '#2a3040',
  },
  cardLabel: { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  pieRow: { flexDirection: 'row', alignItems: 'center' },
  pieLegend: { flex: 1, paddingLeft: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendText: { color: '#aaa', fontSize: 13, lineHeight: 20 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    backgroundColor: '#1a1f2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a3040',
  },
  chargerBadge: {
    width: 48, height: 48, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  chargerBadgeText: { fontSize: 12, fontWeight: '700' },
  sessionInfo: { flex: 1 },
  sessionDate: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sessionSub: { color: '#666', fontSize: 12, marginTop: 2 },
  sessionRight: { alignItems: 'flex-end' },
  sessionKwh: { color: '#10b981', fontSize: 17, fontWeight: '700' },
  sessionCost: { color: '#666', fontSize: 12, marginTop: 2 },
});
