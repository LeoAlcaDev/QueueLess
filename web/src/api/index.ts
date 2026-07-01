// Punto de entrada de la capa de API. Las pantallas importan desde '@/api' y de aca
// salen el wrapper http, las rutas, el ApiError y los tipos de transporte.
export { apiClient, SESSION_EXPIRED_EVENT, getValidAccessToken } from './client';
export { http, unwrap } from './http';
export { endpoints, AUTH_ENDPOINTS } from './endpoints';
export { ApiError, isApiError, normalizeError } from './errors';
export type { ApiErrorKind } from './errors';
export type { ApiResponse, PageResponse, ErrorResponse, FieldError, AuthResponse } from './types';
