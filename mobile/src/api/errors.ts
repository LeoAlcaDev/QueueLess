import { isAxiosError } from 'axios';
import type { ErrorResponse, FieldError } from './types';

export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'business'
  | 'network'
  | 'server'
  | 'unknown';

// Error normalizado que consume toda la app. El cliente traduce cualquier fallo
// (de red o del backend) a uno de estos kinds, así las pantallas eligen el mensaje
// sin volver a mirar el status. Para 400 trae fieldErrors por campo.
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly fieldErrors?: FieldError[];
  readonly path?: string;

  constructor(
    kind: ApiErrorKind,
    message: string,
    opts: { status?: number; fieldErrors?: FieldError[]; path?: string } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = opts.status;
    this.fieldErrors = opts.fieldErrors;
    this.path = opts.path;
  }
}

const MENSAJE_RED = 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.';
const MENSAJE_SERVIDOR = 'Algo salió mal, intenta de nuevo en un momento.';

function kindFromStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 422:
      return 'business';
    default:
      return status >= 500 ? 'server' : 'unknown';
  }
}

export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (isAxiosError(err)) {
    // sin response = nunca llegamos al backend (timeout, sin red, DNS)
    if (!err.response) {
      return new ApiError('network', MENSAJE_RED);
    }
    const status = err.response.status;
    const kind = kindFromStatus(status);
    const body = err.response.data as Partial<ErrorResponse> | undefined;
    // en 5xx nunca exponemos el mensaje crudo del backend; mostramos uno genérico
    const message = kind === 'server' ? MENSAJE_SERVIDOR : body?.message || MENSAJE_SERVIDOR;
    return new ApiError(kind, message, {
      status,
      fieldErrors: body?.fieldErrors ?? undefined,
      path: body?.path,
    });
  }

  return new ApiError('unknown', MENSAJE_SERVIDOR);
}
