// Tipos de transporte del contrato con el backend: la envoltura de exito, la pagina y
// la forma de los errores. Los DTO de cada dominio viven con su area; aca solo va lo
// que comparte toda la app.
import type { Rol } from '@/types/enums';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

// El backend pagina con page 0-indexed, igual que Spring Data.
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

// Los errores NO vienen envueltos en ApiResponse; salen del manejador global con esta
// forma. fieldErrors solo se llena en los 400 de validacion.
export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: FieldError[] | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  usuarioId: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}
