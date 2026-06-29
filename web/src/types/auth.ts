import type { Rol } from "./enums";

// Auth y sesión (MAPA-FRONTEND §2).

export interface RegisterRequest {
  email: string;
  /** mínimo 8 caracteres (validado en backend). */
  password: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

/** Payload de register/login/refresh (dentro de `data`). */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  usuarioId: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface UsuarioResponse {
  id: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface ActivarRolRequest {
  rol: Rol;
}
