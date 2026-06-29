import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse, AuthResponse, ErrorResponse } from "@/types";
import { ApiError } from "@/lib/errors";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/storage";

// Base = ORIGEN del backend (sin /api). Cada llamada incluye la ruta completa
// (/api/v1/..., /api/auth/...). Dev: 8090 · Prod: 8080 (MAPA-FRONTEND §1.3).
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8090";

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Rutas donde un 401/403 NO debe disparar refresh (son las propias de la sesión).
const AUTH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
];
function isAuthPath(url?: string): boolean {
  return !!url && AUTH_PATHS.some((p) => url.includes(p));
}

// ----------------------------------------------------------------------------
// Request: inyectar el access token vigente.
// ----------------------------------------------------------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && !isAuthPath(config.url)) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// ----------------------------------------------------------------------------
// Refresh-on-403 con cola de requests en vuelo (MAPA-FRONTEND §2.3/§7).
// Un solo refresh a la vez; el resto espera y reintenta con el token nuevo.
// ----------------------------------------------------------------------------
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshing: Promise<string> | null = null;

async function runRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  // Llamada "cruda" (sin interceptores) para no recursar en el refresh.
  const res = await axios.post<ApiResponse<AuthResponse>>(
    `${API_URL}/api/auth/refresh`,
    { refreshToken },
    { headers: { "Content-Type": "application/json" } },
  );
  const auth = res.data.data;
  setTokens(auth.accessToken, auth.refreshToken);
  return auth.accessToken;
}

function normalizeError(error: AxiosError<ErrorResponse>): ApiError {
  if (error.response) {
    const body = error.response.data;
    return new ApiError({
      status: error.response.status,
      message: body?.message ?? error.message,
      fieldErrors: body?.fieldErrors ?? null,
      raw: body,
    });
  }
  // Sin respuesta: red/timeout/offline.
  return new ApiError({ status: 0, message: error.message, offline: true });
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    // 403 ambiguo (token vencido o permiso real): intentar refresh UNA vez.
    if (
      status === 403 &&
      original &&
      !original._retry &&
      !isAuthPath(original.url) &&
      getRefreshToken()
    ) {
      original._retry = true;
      try {
        refreshing = refreshing ?? runRefresh();
        const newToken = await refreshing;
        refreshing = null;
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return api(original);
      } catch {
        // Refresh falló (401/expirado): sesión caída -> limpiar -> Login.
        refreshing = null;
        clearTokens();
        return Promise.reject(normalizeError(error));
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

// ----------------------------------------------------------------------------
// Helpers tipados que desenvuelven el sobre ApiResponse y devuelven el payload.
// Para listados paginados, T = Page<X>. Para DELETE (204) usar `del`.
// ----------------------------------------------------------------------------
export const http = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await api.get<ApiResponse<T>>(url, config);
    return res.data.data;
  },
  async post<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res = await api.post<ApiResponse<T>>(url, body, config);
    return res.data.data;
  },
  async put<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res = await api.put<ApiResponse<T>>(url, body, config);
    return res.data.data;
  },
  async patch<T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res = await api.patch<ApiResponse<T>>(url, body, config);
    return res.data.data;
  },
  /** POST multipart/form-data (axios calcula el boundary a partir del FormData). */
  async postForm<T>(url: string, form: FormData): Promise<T> {
    const res = await api.post<ApiResponse<T>>(url, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
  /** DELETE → 204 sin cuerpo (no usa ApiResponse). */
  async del(url: string, config?: AxiosRequestConfig): Promise<void> {
    await api.delete(url, config);
  },
};

export { API_URL };
