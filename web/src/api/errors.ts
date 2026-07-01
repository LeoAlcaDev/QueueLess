// Normaliza cualquier error de red o del backend a un ApiError tipado, con un kind por
// codigo HTTP. La UI decide que mostrar mirando el kind, no el numero suelto.
import { AxiosError } from 'axios';
import type { ErrorResponse, FieldError } from './types';

export type ApiErrorKind =
  | 'validation' // 400, con errores por campo
  | 'unauthorized' // 401, solo login/refresh con credenciales malas
  | 'forbidden' // 403, sin permiso o token vencido
  | 'notFound' // 404, no existe o es ajeno
  | 'conflict' // 409, duplicado o choca con el estado
  | 'businessRule' // 422, regla de negocio (mensaje real del backend)
  | 'server' // 500
  | 'network' // sin respuesta del servidor
  | 'canceled' // request abortado (AbortController)
  | 'unknown';

const STATUS_KIND: Record<number, ApiErrorKind> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'notFound',
  409: 'conflict',
  422: 'businessRule',
};

// Mensajes por defecto para cuando el backend no manda uno legible. En los 422 siempre
// preferimos el mensaje real del backend, que es de cara al usuario.
const FALLBACK: Record<ApiErrorKind, string> = {
  validation: 'Revisa los datos del formulario.',
  unauthorized: 'Credenciales inválidas.',
  forbidden: 'No tienes permiso para esta acción.',
  notFound: 'No encontramos lo que buscas.',
  conflict: 'Hay un conflicto con el estado actual.',
  businessRule: 'No se pudo completar la operación.',
  server: 'Ocurrió un error inesperado. Intenta de nuevo.',
  network: 'No pudimos conectar. Revisa tu conexión.',
  canceled: 'Operación cancelada.',
  unknown: 'Algo salió mal.',
};

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly fieldErrors: FieldError[];
  readonly path?: string;

  constructor(
    kind: ApiErrorKind,
    message: string,
    opts: { status?: number; fieldErrors?: FieldError[]; path?: string } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = opts.status ?? 0;
    this.fieldErrors = opts.fieldErrors ?? [];
    this.path = opts.path;
  }

  // arma un mapa campo -> mensaje, comodo para pintar errores en los formularios
  get fieldErrorMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const fe of this.fieldErrors) {
      if (!map[fe.field]) map[fe.field] = fe.message;
    }
    return map;
  }
}

export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const axiosError = error as AxiosError<ErrorResponse>;

  if (axiosError?.code === 'ERR_CANCELED') {
    return new ApiError('canceled', FALLBACK.canceled);
  }

  if (axiosError?.response) {
    const { status, data } = axiosError.response;
    const kind = STATUS_KIND[status] ?? (status >= 500 ? 'server' : 'unknown');
    const message = data?.message || FALLBACK[kind];
    return new ApiError(kind, message, {
      status,
      fieldErrors: data?.fieldErrors ?? [],
      path: data?.path,
    });
  }

  // sin response: el backend esta caido o no hay red
  return new ApiError('network', FALLBACK.network);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
