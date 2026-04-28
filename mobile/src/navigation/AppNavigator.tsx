import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardScreen from '../screens/DashboardScreen';
import DrivesScreen from '../screens/DrivesScreen';
import ChargesScreen from '../screens/ChargesScreen';
import AuthScreen from '../screens/AuthScreen';

const Tab = createBottomTabNavigator();

const icons: Record<string, string> = {
  Dashboard: '🏠',
  Guida: '🚗',
  Ricariche: '⚡',
};

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const demo = await AsyncStorage.getItem('demo_mode');
    setIsAuthenticated(!!(token || demo));
  };

  if (isAuthenticated === null) return null; // Splash

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => {
            const icon = icons[route.name] ?? '●';
            return <Text style={{ fontSize: focused ? 24 : 20 }}>{icon}</Text>;
          },
          tabBarActiveTintColor: '#cc0000',
          tabBarInactiveTintColor: '#555',
          tabBarStyle: {
            backgroundColor: '#0f1117',
            borderTopColor: '#1e2530',
            borderTopWidth: 1,
            paddingBottom: 8,
            height: 60,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          headerStyle: { backgroundColor: '#0f1117', shadowColor: 'transparent' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
        <Tab.Screen name="Guida" component={DrivesScreen} options={{ title: 'Percorsi' }} />
        <Tab.Screen name="Ricariche" component={ChargesScreen} options={{ title: 'Ricariche' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Importazione mancante (per evitare errori TypeScript)
import { Text } from 'react-native';
