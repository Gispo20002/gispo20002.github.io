import axios, { AxiosInstance } from 'axios';
import { getPool, sql } from '../db/connection';

const TESLA_API_BASE = process.env.TESLA_API_BASE || 'https://fleet-api.prd.eu.vn.cloud.tesla.com';
// La partner registration va sempre fatta sull'endpoint NA (dove è basato developer.tesla.com)
const TESLA_API_NA = 'https://fleet-api.prd.na.vn.cloud.tesla.com';
const TESLA_AUTH_BASE = process.env.TESLA_AUTH_BASE || 'https://auth.tesla.com';
const CLIENT_ID = process.env.TESLA_CLIENT_ID!;
const CLIENT_SECRET = process.env.TESLA_CLIENT_SECRET!;
const REDIRECT_URI = process.env.TESLA_REDIRECT_URI!;

export interface VehicleState {
  battery_level: number;
  battery_range: number;
  charging_state: string;
  latitude: number;
  longitude: number;
  speed: number;
  odometer: number;
  locked: boolean;
}

export interface DriveData {
  start_time: Date;
  end_time: Date;
  distance_km: number;
  energy_used_kwh: number;
  max_speed: number;
  avg_speed: number;
}

export interface ChargeSession {
  start_time: Date;
  end_time: Date;
  energy_added_kwh: number;
  charge_rate_kw: number;
  charger_type: string;
}

class TeslaService {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({ baseURL: TESLA_API_BASE });
  }

  // Genera URL per login OAuth Tesla
  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'vehicle_device_data vehicle_location vehicle_charging_cmds offline_access',
      state: 'teslapp_auth',
    });
    return `${TESLA_AUTH_BASE}/oauth2/v3/authorize?${params}`;
  }

  // Scambia il codice OAuth con i token
  async exchangeCode(code: string): Promise<void> {
    const res = await axios.post(
      `${TESLA_AUTH_BASE}/oauth2/v3/token`,
      {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        audience: TESLA_API_BASE,   // richiesto dalla Fleet API
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    await this.saveTokens(res.data.access_token, res.data.refresh_token, res.data.expires_in);
    this.accessToken = res.data.access_token;
  }

  // Refresh token
  async refreshAccessToken(): Promise<void> {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 1 refresh_token FROM tokens ORDER BY id DESC
    `);

    if (!result.recordset[0]) throw new Error('Nessun token salvato');
    const refreshToken = result.recordset[0].refresh_token;

    const res = await axios.post(`${TESLA_AUTH_BASE}/oauth2/v3/token`, {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    });

    await this.saveTokens(res.data.access_token, res.data.refresh_token, res.data.expires_in);
    this.accessToken = res.data.access_token;
  }

  private async saveTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const pool = await getPool();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await pool.request()
      .input('at', sql.NVarChar(sql.MAX), accessToken)
      .input('rt', sql.NVarChar(sql.MAX), refreshToken)
      .input('ea', sql.DateTime2, expiresAt)
      .query(`INSERT INTO tokens (access_token, refresh_token, expires_at) VALUES (@at, @rt, @ea)`);
  }

  private async getValidToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 1 access_token, expires_at FROM tokens ORDER BY id DESC
    `);

    if (!result.recordset[0]) throw new Error('Utente non autenticato');

    const { access_token, expires_at } = result.recordset[0];
    if (new Date(expires_at) <= new Date()) {
      await this.refreshAccessToken();
      return this.accessToken!;
    }

    this.accessToken = access_token;
    return access_token;
  }

  // Registra il partner account Tesla su un endpoint specifico
  private async registerOnEndpoint(domain: string, endpoint: string): Promise<any> {
    const tokenRes = await axios.post(
      `${TESLA_AUTH_BASE}/oauth2/v3/token`,
      {
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'openid vehicle_device_data vehicle_location vehicle_charging_cmds',
        audience: endpoint,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const appToken = tokenRes.data.access_token;
    console.log(`🔑 Token ottenuto per ${endpoint}`);

    const regRes = await axios.post(
      `${endpoint}/api/1/partner_accounts`,
      { domain },
      { headers: { Authorization: `Bearer ${appToken}`, 'Content-Type': 'application/json' } }
    );

    console.log(`✅ Partner registrato su ${endpoint}:`, regRes.data);
    return regRes.data;
  }

  // Registra su NA + EU (Tesla richiede la registrazione su ogni regione usata)
  async registerPartner(domain: string): Promise<any> {
    const results: Record<string, any> = {};

    for (const [region, endpoint] of [
      ['NA', TESLA_API_NA],
      ['EU', TESLA_API_BASE],
    ] as const) {
      try {
        results[region] = await this.registerOnEndpoint(domain, endpoint);
      } catch (err: any) {
        const detail = err.response?.data ?? err.message;
        console.warn(`⚠️  Registrazione ${region} non riuscita:`, detail);
        results[region] = { error: detail };
      }
    }

    return results;
  }

  // Lista veicoli
  async getVehicles(): Promise<any[]> {
    const token = await this.getValidToken();
    const res = await this.client.get('/api/1/vehicles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.response;
  }

  // Stato veicolo in tempo reale
  async getVehicleData(vehicleId: string): Promise<any> {
    const token = await this.getValidToken();
    const res = await this.client.get(`/api/1/vehicles/${vehicleId}/vehicle_data`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        endpoints: 'charge_state;drive_state;vehicle_state;climate_state',
      },
    });
    return res.data.response;
  }

  // Sveglia il veicolo se in sleep
  async wakeUp(vehicleId: string): Promise<void> {
    const token = await this.getValidToken();
    await this.client.post(`/api/1/vehicles/${vehicleId}/wake_up`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Aspetta che si svegli
    await new Promise(r => setTimeout(r, 5000));
  }

  // Salva snapshot dello stato nel DB
  async saveVehicleState(vehicleId: number, data: any): Promise<void> {
    const pool = await getPool();
    const cs = data.charge_state;
    const ds = data.drive_state;
    const vs = data.vehicle_state;

    await pool.request()
      .input('vid', sql.Int, vehicleId)
      .input('bat', sql.Int, cs?.battery_level ?? null)
      .input('range', sql.Float, cs?.battery_range ?? null)
      .input('charging', sql.NVarChar(30), cs?.charging_state ?? null)
      .input('lat', sql.Float, ds?.latitude ?? null)
      .input('lon', sql.Float, ds?.longitude ?? null)
      .input('speed', sql.Float, ds?.speed ?? null)
      .input('odo', sql.Float, vs?.odometer ?? null)
      .input('locked', sql.Bit, vs?.locked ? 1 : 0)
      .query(`
        INSERT INTO vehicle_states
          (vehicle_id, battery_level, battery_range, charging_state, latitude, longitude, speed, odometer, locked)
        VALUES
          (@vid, @bat, @range, @charging, @lat, @lon, @speed, @odo, @locked)
      `);
  }
}

export const teslaService = new TeslaService();
