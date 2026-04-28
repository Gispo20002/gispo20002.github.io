import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../api/client';

interface Props {
  onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: Props) {
  const handleLogin = async () => {
    try {
      // Apre il browser per il login Tesla OAuth
      const loginUrl = `${API_BASE}/auth/login`;
      const canOpen = await Linking.canOpenURL(loginUrl);
      if (canOpen) {
        await Linking.openURL(loginUrl);
      } else {
        Alert.alert('Errore', 'Impossibile aprire il browser');
      }
    } catch (err) {
      Alert.alert('Errore', 'Errore durante il login Tesla');
    }
  };

  const handleDemoMode = async () => {
    await AsyncStorage.setItem('demo_mode', 'true');
    onAuthenticated();
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Text style={styles.logo}>⚡</Text>
        <Text style={styles.appName}>TeslApp</Text>
        <Text style={styles.tagline}>Il tuo cruscotto Tesla personale</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.infoTitle}>Prima di iniziare</Text>
        <Text style={styles.infoText}>
          Hai bisogno di un account Tesla e delle credenziali API da{' '}
          <Text style={styles.link} onPress={() => Linking.openURL('https://developer.tesla.com')}>
            developer.tesla.com
          </Text>
          {'\n\n'}
          Consulta il file{' '}
          <Text style={styles.mono}>TESLA_API_SETUP.md</Text>
          {' '}nella cartella del progetto per la guida completa.
        </Text>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginBtnText}>🔑 Connetti il tuo Tesla</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.demoBtn} onPress={handleDemoMode}>
          <Text style={styles.demoBtnText}>📊 Entra in modalità demo</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          TeslApp è un'app personale e non è affiliata con Tesla, Inc.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1117' },
  logoArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 60,
  },
  logo: { fontSize: 72 },
  appName: {
    color: '#fff', fontSize: 42, fontWeight: '800',
    letterSpacing: -1, marginTop: 12,
  },
  tagline: { color: '#666', fontSize: 16, marginTop: 8 },
  content: {
    padding: 28, paddingBottom: 48,
    borderTopWidth: 1, borderTopColor: '#1e2530',
  },
  infoTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  infoText: { color: '#888', fontSize: 14, lineHeight: 22, marginBottom: 28 },
  link: { color: '#cc0000', textDecorationLine: 'underline' },
  mono: { fontFamily: 'Courier', color: '#aaa' },
  loginBtn: {
    backgroundColor: '#cc0000', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  demoBtn: {
    backgroundColor: '#1a1f2e', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a3040',
  },
  demoBtnText: { color: '#aaa', fontSize: 16, fontWeight: '600' },
  disclaimer: { color: '#444', fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
