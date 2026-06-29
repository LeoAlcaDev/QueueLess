import { http } from "./client";
import type {
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
} from "@/types";

// Auth pública (MAPA-FRONTEND §3.1). El refresh automático lo maneja el
// interceptor; esta función queda por si se necesita refrescar a mano
// (p. ej. tras activar-rol para que el access incluya la nueva autoridad).

export function register(body: RegisterRequest): Promise<AuthResponse> {
  return http.post<AuthResponse>("/api/auth/register", body);
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return http.post<AuthResponse>("/api/auth/login", body);
}

export function refresh(body: RefreshTokenRequest): Promise<AuthResponse> {
  return http.post<AuthResponse>("/api/auth/refresh", body);
}
