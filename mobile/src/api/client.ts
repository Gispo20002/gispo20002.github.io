import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cambia con il tuo IP locale quando sviluppi, o con il dominio in produzione
export const API_BASE = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Interceptor: aggiunge il JWT ad ogni richiesta
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ─── API helpers ──────────────────────────────────────────────

export const VehicleAPI = {
  getAll: () => api.get('/vehicle'),
  getLive: (id: string) => api.get(`/vehicle/${id}/live`),
  getHistory: (id: string, hours = 24) =>
    api.get(`/vehicle/${id}/history`, { params: { hours } }),
  wake: (id: string) => api.post(`/vehicle/${id}/wake`),
  getDemo: () => api.get('/demo/vehicle'),
};

export const DrivesAPI = {
  getAll: (limit = 50) => api.get('/drives', { params: { limit } }),
  getStats: (days = 30) => api.get('/drives/stats', { params: { days } }),
  getDaily: (days = 30) => api.get('/drives/daily', { params: { days } }),
};

export const ChargesAPI = {
  getAll: (limit = 50) => api.get('/charges', { params: { limit } }),
  getStats: (days = 30) => api.get('/charges/stats', { params: { days } }),
  getMonthly: () => api.get('/charges/monthly'),
};

export const AuthAPI = {
  getStatus: () => api.get('/auth/status'),
  logout: () => api.post('/auth/logout'),
};
