import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { VehicleAPI } from '../api/client';

interface VehicleState {
  display_name: string;
  model: string;
  battery_level: number;
  battery_range: number;
  charging_state: string;
  speed: number;
  odometer: number;
  locked: boolean;
  recorded_at: string;
}

export default function DashboardScreen() {
  const [vehicle, setVehicle] = useState<VehicleState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Prova dati reali, fallback su demo
      try {
        const res = await VehicleAPI.getAll();
        if (res.data.length > 0) {
          setVehicle(res.data[0]);
          return;
        }
      } catch {}
      const demo = await VehicleAPI.getDemo();
      setVehicle(demo.data);
    } catch (e) {
      Alert.alert('Errore', 'Impossibile caricare i dati del veicolo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#cc0000" />
        <Text style={styles.loadingText}>Caricamento dati Tesla...</Text>
      </View>
    );
  }

  const batteryColor = !vehicle ? '#666'
    : vehicle.battery_level > 50 ? '#10b981'
    : vehicle.battery_level > 20 ? '#f59e0b'
    : '#ef4444';

  const chargingLabel: Record<string, string> = {
    'Charging': '⚡ In ricarica',
    'Complete': '✅ Carica completa',
    'Disconnected': '🔌 Disconnesso',
    'Stopped': '⏸ Ricarica fermata',
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cc0000" />}
    >
      {/* Header veicolo */}
      <View style={styles.header}>
        <Text style={styles.carName}>{vehicle?.display_name ?? 'Tesla'}</Text>
        <Text style={styles.carModel}>{vehicle?.model ?? '—'}</Text>
        <Text style={styles.lockStatus}>{vehicle?.locked ? '🔒 Bloccata' : '🔓 Sbloccata'}</Text>
      </View>

      {/* Batteria */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>BATTERIA</Text>
        <Text style={[styles.bigNumber, { color: batteryColor }]}>
          {vehicle?.battery_level ?? '—'}%
        </Text>
        <View style={styles.batteryBarBg}>
          <View style={[styles.batteryBarFill, {
            width: `${vehicle?.battery_level ?? 0}%`,
            backgroundColor: batteryColor,
          }]} />
        </View>
        <Text style={styles.subText}>
          {vehicle?.battery_range ? `${vehicle.battery_range.toFixed(0)} km di autonomia` : '—'}
        </Text>
        <Text style={[styles.chargingBadge, {
          color: vehicle?.charging_state === 'Charging' ? '#10b981' : '#888',
        }]}>
          {chargingLabel[vehicle?.charging_state ?? ''] ?? vehicle?.charging_state ?? '—'}
        </Text>
      </View>

      {/* Stats rapide */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Velocità</Text>
          <Text style={styles.statValue}>{vehicle?.speed ?? 0} km/h</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Odometro</Text>
          <Text style={styles.statValue}>
            {vehicle?.odometer ? `${(vehicle.odometer / 1.609).toFixed(0)} km` : '—'}
          </Text>
        </View>
      </View>

      {/* Ultimo aggiornamento */}
      <Text style={styles.timestamp}>
        Aggiornato:{' '}
        {vehicle?.recorded_at
          ? new Date(vehicle.recorded_at).toLocaleTimeString('it-IT')
          : '—'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1117' },
  loadingText: { color: '#888', marginTop: 12, fontSize: 14 },
  header: {
    alignItems: 'center', paddingTop: 40, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: '#1e2530',
  },
  carName: { color: '#fff', fontSize: 28, fontWeight: '700' },
  carModel: { color: '#888', fontSize: 16, marginTop: 4 },
  lockStatus: { color: '#666', fontSize: 14, marginTop: 8 },
  card: {
    margin: 16, padding: 20,
    backgroundColor: '#1a1f2e', borderRadius: 16,
    borderWidth: 1, borderColor: '#2a3040',
  },
  cardLabel: { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  bigNumber: { fontSize: 56, fontWeight: '800', lineHeight: 64 },
  batteryBarBg: {
    height: 8, backgroundColor: '#2a3040', borderRadius: 4,
    marginVertical: 12, overflow: 'hidden',
  },
  batteryBarFill: { height: '100%', borderRadius: 4 },
  subText: { color: '#aaa', fontSize: 16, marginTop: 4 },
  chargingBadge: { fontSize: 14, marginTop: 8, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  statCard: {
    flex: 1, padding: 16,
    backgroundColor: '#1a1f2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a3040', alignItems: 'center',
  },
  statLabel: { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 6 },
  timestamp: { color: '#444', fontSize: 12, textAlign: 'center', marginTop: 20, marginBottom: 32 },
});
