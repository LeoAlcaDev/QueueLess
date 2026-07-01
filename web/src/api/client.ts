import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@/auth/tokenStorage';
import { isExpired } from '@/lib/jwt';
import { normalizeError } from './errors';
import { AUTH_ENDPOINTS } from './endpoints';
import type { ApiResponse, AuthResponse } from './types';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://queueless-prod-alb-1673624815.us-east-1.elb.amazonaws.com/api';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Cuando el refresh falla de verdad, avisamos al resto de la app: AuthContext escucha
// este evento para limpiar la sesion y mandar al login.
export const SESSION_EXPIRED_EVENT = 'queueless:session-expired';

function notifySessionExpired(): void {
  tokenStorage.clear();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

// Una sola promesa de refresh en vuelo: si varios requests encuentran el token vencido
// al mismo tiempo, todos esperan el mismo refresh en lugar de disparar uno cada uno.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error('No hay refresh token');
  // axios pelado, sin los interceptores, para no entrar en recursion con el refresh
  const res = await axios.post<ApiResponse<AuthResponse>>(
    `${baseURL}${AUTH_ENDPOINTS.refresh}`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const auth = res.data.data;
  tokenStorage.set(auth.accessToken, auth.refreshToken);
  return auth.accessToken;
}

function ensureRefreshed(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Devuelve un access token vigente, refrescando si hace falta. Lo usa el SSE, que abre
// la conexion por fuera de los interceptores y necesita un token fresco a mano.
export async function getValidAccessToken(): Promise<string | null> {
  const access = tokenStorage.getAccess();
  if (!access) return null;
  if (tokenStorage.getRefresh() && isExpired(access)) {
    try {
      return await ensureRefreshed();
    } catch {
      notifySessionExpired();
      return null;
    }
  }
  return access;
}

// Request: adjunta el Bearer y, si el access ya vencio segun el reloj local, lo refresca
// antes de salir para no comerse un 403 seguro.
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let access = tokenStorage.getAccess();
  if (access && tokenStorage.getRefresh() && isExpired(access)) {
    try {
      access = await ensureRefreshed();
    } catch {
      notifySessionExpired();
      access = null;
    }
  }
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Response: un 403 con el access vencido (se escapo entre el chequeo local y el server,
// o por desfase de reloj) se refresca una vez y se reintenta; un 403 con access vigente
// es denegacion real de rol, se deja pasar como error sin reintentar.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const isRefreshCall = Boolean(config?.url?.includes(AUTH_ENDPOINTS.refresh));
    const access = tokenStorage.getAccess();
    const accessVencido = access ? isExpired(access, 0) : false;

    if (
      status === 403 &&
      config &&
      !config._retry &&
      !isRefreshCall &&
      tokenStorage.getRefresh() &&
      accessVencido
    ) {
      config._retry = true;
      try {
        const fresh = await ensureRefreshed();
        config.headers.Authorization = `Bearer ${fresh}`;
        return apiClient(config);
      } catch {
        notifySessionExpired();
      }
    }

    // si el propio refresh devolvio 401, la sesion ya no sirve
    if (status === 401 && isRefreshCall) {
      notifySessionExpired();
    }

    return Promise.reject(normalizeError(error));
  },
);
