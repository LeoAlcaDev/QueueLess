// Envoltorio de respuesta y formas transversales de la API (MAPA-FRONTEND §1).

/** Éxito: todos los REST envuelven en este sobre. El payload va en `data`. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

/** Paginación del backend (PageResponse). `data` de los listados paginados. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Una línea de error de validación de body (400 @Valid). */
export interface FieldError {
  field: string;
  message: string;
}

/** Cuerpo de error del @RestControllerAdvice (NO envuelto en ApiResponse). */
export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  /** Solo poblado en el 400 de validación de body; null en el resto. */
  fieldErrors: FieldError[] | null;
}

/** Parámetros de paginación que aceptan los listados con Pageable. */
export interface PageParams {
  page?: number;
  size?: number;
  /** Formato Spring: `campo,asc` | `campo,desc`. */
  sort?: string;
}
