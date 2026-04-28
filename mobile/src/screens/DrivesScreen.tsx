import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryLine } from 'victory-native';
import { DrivesAPI } from '../api/client';

interface DriveStats {
  total_drives: number;
  total_km: number;
  total_kwh: number;
  avg_speed: number;
  max_speed_ever: number;
  total_minutes: number;
}

interface DailyData {
  date: string;
  drives: number;
  km: number;
  kwh: number;
}

interface Drive {
  id: number;
  start_time: string;
  end_time: string;
  distance_km: number;
  energy_used_kwh: number;
  avg_speed: number;
  duration_minutes: number;
}

export default function DrivesScreen() {
  const [stats, setStats] = useState<DriveStats | null>(null);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);

  // Dati demo se il backend non risponde
  const demoStats: DriveStats = {
    total_drives: 24, total_km: 842.5, total_kwh: 148.3,
    avg_speed: 62, max_speed_ever: 142, total_minutes: 810,
  };
  const demoDaily: DailyData[] = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('it-IT', { weekday: 'short' }),
    drives: Math.floor(Math.random() * 3) + 1,
    km: Math.floor(Math.random() * 80) + 10,
    kwh: Math.floor(Math.random() * 15) + 2,
  }));

  useEffect(() => {
    async function load() {
      try {
        const [s, d, dr] = await Promise.all([
          DrivesAPI.getStats(30),
          DrivesAPI.getDaily(7),
          DrivesAPI.getAll(10),
        ]);
        setStats(s.data);
        setDaily(d.data);
        setDrives(dr.data);
      } catch {
        setStats(demoStats);
        setDaily(demoDaily);
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

  const chartData = daily.map((d, i) => ({ x: i + 1, y: d.km, label: d.date }));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>ULTIMI 30 GIORNI</Text>

      {/* Statistiche aggregate */}
      <View style={styles.statsGrid}>
        <StatBox label="Percorsi" value={`${stats?.total_drives ?? 0}`} unit="" color="#3b82f6" />
        <StatBox label="Km totali" value={`${stats?.total_km.toFixed(0) ?? 0}`} unit="km" color="#10b981" />
        <StatBox label="Energia" value={`${stats?.total_kwh.toFixed(1) ?? 0}`} unit="kWh" color="#f59e0b" />
        <StatBox label="Vel. media" value={`${stats?.avg_speed.toFixed(0) ?? 0}`} unit="km/h" color="#8b5cf6" />
      </View>

      {/* Grafico km giornalieri */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>KM GIORNALIERI (7 GIORNI)</Text>
        <VictoryChart
          theme={VictoryTheme.material}
          height={200}
          padding={{ left: 50, right: 20, top: 20, bottom: 40 }}
        >
          <VictoryAxis
            tickValues={chartData.map(d => d.x)}
            tickFormat={daily.map(d => d.date)}
            style={{ tickLabels: { fill: '#666', fontSize: 10 }, axis: { stroke: '#2a3040' }, grid: { stroke: 'transparent' } }}
          />
          <VictoryAxis
            dependentAxis
            style={{ tickLabels: { fill: '#666', fontSize: 10 }, axis: { stroke: '#2a3040' }, grid: { stroke: '#1e2530' } }}
          />
          <VictoryBar
            data={chartData}
            style={{ data: { fill: '#cc0000', borderRadius: 4 } }}
            cornerRadius={{ top: 4 }}
          />
        </VictoryChart>
      </View>

      {/* Lista ultimi percorsi */}
      <Text style={styles.sectionTitle}>ULTIMI PERCORSI</Text>
      {(drives.length > 0 ? drives : demoDrives).map((drive, i) => (
        <View key={i} style={styles.driveRow}>
          <View style={styles.driveLeft}>
            <Text style={styles.driveDate}>
              {new Date(drive.start_time).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
            </Text>
            <Text style={styles.driveTime}>
              {new Date(drive.start_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.driveRight}>
            <Text style={styles.driveKm}>{(drive.distance_km ?? 0).toFixed(1)} km</Text>
            <Text style={styles.driveSub}>
              {(drive.energy_used_kwh ?? 0).toFixed(1)} kWh · {drive.duration_minutes} min
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function StatBox({ label, value, unit, color }: any) {
  return (
    <View style={[styles.statBox, { borderTopColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );
}

// Dati demo per la lista percorsi
const demoDrives: Drive[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  start_time: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  end_time: new Date(Date.now() - i * 86400000 * 2 + 3600000).toISOString(),
  distance_km: Math.floor(Math.random() * 60) + 5,
  energy_used_kwh: Math.floor(Math.random() * 12) + 1,
  avg_speed: Math.floor(Math.random() * 40) + 40,
  duration_minutes: Math.floor(Math.random() * 60) + 10,
}));

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1117' },
  sectionTitle: {
    color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginHorizontal: 16, marginTop: 24, marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 8,
  },
  statBox: {
    width: '47%', padding: 16, backgroundColor: '#1a1f2e',
    borderRadius: 12, borderTopWidth: 3,
    borderWidth: 1, borderColor: '#2a3040',
  },
  statLabel: { color: '#666', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  statValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  statUnit: { color: '#555', fontSize: 12, marginTop: 2 },
  card: {
    margin: 16, padding: 16, backgroundColor: '#1a1f2e',
    borderRadius: 16, borderWidth: 1, borderColor: '#2a3040',
  },
  cardLabel: { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  driveRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    backgroundColor: '#1a1f2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a3040',
  },
  driveLeft: { flex: 1 },
  driveRight: { alignItems: 'flex-end' },
  driveDate: { color: '#fff', fontSize: 15, fontWeight: '600' },
  driveTime: { color: '#666', fontSize: 12, marginTop: 2 },
  driveKm: { color: '#10b981', fontSize: 18, fontWeight: '700' },
  driveSub: { color: '#666', fontSize: 12, marginTop: 2 },
});
