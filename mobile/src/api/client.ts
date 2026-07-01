import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios';
import { isExpired } from '@/auth/jwt';
import { authBridge } from './authBridge';
import { endpoints } from './endpoints';
import { normalizeError } from './errors';
import type { ApiResponse, AuthResponse } from './types';

// por defecto pega al backend deployado en AWS; para desarrollo local se sobrescribe
// con EXPO_PUBLIC_API_URL en el .env apuntando a la máquina
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://queueless-prod-alb-1673624815.us-east-1.elb.amazonaws.com/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// instancia pelada (sin interceptores) para refrescar, así el refresh no se mete
// en su propia lógica de reintento
const bare = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// refresco en vuelo único: si varias peticiones se topan con el token vencido a la
// vez, todas esperan el mismo refresh en lugar de disparar varios
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// expuesto para el refresh dirigido por el usuario (ej. tras activar un rol nuevo,
// que en el backend no reemite el token solo)
export function forceRefresh(): Promise<string | null> {
  return refreshAccessToken();
}

async function doRefresh(): Promise<string | null> {
  try {
    const refreshToken = await authBridge.getRefreshToken();
    if (!refreshToken) throw new Error('sin refresh token');
    const res = await bare.post<ApiResponse<AuthResponse>>(endpoints.auth.refresh(), { refreshToken });
    const { accessToken, refreshToken: nuevoRefresh } = res.data.data;
    await authBridge.setTokens(accessToken, nuevoRefresh);
    return accessToken;
  } catch {
    await authBridge.clear();
    authBridge.emitSessionExpired();
    return null;
  }
}

// request: adjunta el Bearer. Si el access ya venció (chequeo del exp local),
// refresca antes de mandar, así no gastamos un 403 de ida.
api.interceptors.request.use(async (config) => {
  let token = await authBridge.getAccessToken();
  if (token && isExpired(token)) {
    token = await refreshAccessToken();
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// response: el backend usa 403 tanto para token vencido como para denegación de
// rol. Si el token que mandamos estaba vencido, fue expiración: refrescamos y
// reintentamos una sola vez. Si estaba vigente, es falta de rol: no refrescamos
// (evita el loop). Todo lo demás se normaliza a ApiError.
api.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 403) {
      const original = error.config as RetriableConfig | undefined;
      const sent = original?.headers?.Authorization;
      const sentToken = typeof sent === 'string' ? sent.replace('Bearer ', '') : null;
      if (original && !original._retried && sentToken && isExpired(sentToken)) {
        original._retried = true;
        const fresh = await refreshAccessToken();
        if (fresh) {
          original.headers.Authorization = `Bearer ${fresh}`;
          return api.request(original);
        }
      }
    }
    return Promise.reject(normalizeError(error));
  },
);
