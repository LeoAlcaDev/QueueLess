import type { ErrorResponse, FieldError } from "@/types";

/**
 * Error normalizado que rechaza el cliente HTTP. Todo el front captura esto:
 * trae el status, el `message` del backend (mostrable cuando aplica) y los
 * `fieldErrors` del 400 de validación. Ver MAPA-FRONTEND §7.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldError[] | null;
  /** true cuando no hubo respuesta (red/timeout/offline). */
  readonly offline: boolean;
  readonly raw?: ErrorResponse;

  constructor(params: {
    status: number;
    message: string;
    fieldErrors?: FieldError[] | null;
    offline?: boolean;
    raw?: ErrorResponse;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.fieldErrors = params.fieldErrors ?? null;
    this.offline = params.offline ?? false;
    this.raw = params.raw;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Convierte los fieldErrors (400) en un mapa campo -> mensaje para pintar inline. */
export function fieldErrorMap(error: unknown): Record<string, string> {
  if (!isApiError(error) || !error.fieldErrors) return {};
  const map: Record<string, string> = {};
  for (const fe of error.fieldErrors) {
    if (fe.field && !map[fe.field]) map[fe.field] = fe.message;
  }
  return map;
}

/**
 * Mensaje "seguro" para mostrar al usuario según el status (MAPA-FRONTEND §7.1).
 * Para 404/409/422 el `message` del backend está pensado para mostrarse; para
 * 401/403/500 y la mayoría de 400 el texto es fijo/genérico y no se debe confiar.
 */
export function userFacingMessage(error: unknown): string {
  if (!isApiError(error)) return "Algo salió mal, intenta de nuevo.";
  if (error.offline)
    return "Sin conexión. Revisa tu internet e intenta de nuevo.";
  switch (error.status) {
    case 400:
      return error.fieldErrors?.length
        ? "Revisa los campos marcados."
        : error.message || "Petición inválida.";
    case 401:
      return "Credenciales inválidas.";
    case 403:
      return error.message || "No tienes acceso a esto.";
    case 404:
      return error.message || "No existe o no es tuyo.";
    case 409:
    case 422:
      return error.message || "No se pudo completar la acción.";
    case 500:
      return "Algo salió mal, intenta de nuevo.";
    default:
      return error.message || "Algo salió mal, intenta de nuevo.";
  }
}
