import type { FieldErrors, FieldValues, Path, Resolver, UseFormSetError } from 'react-hook-form';

// Forma minima de un schema de zod: solo usamos safeParse. La tipamos estructuralmente para
// no atarnos a los genericos internos de zod, que cambian entre versiones.
interface ParsableSchema<T> {
  safeParse(data: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string; code: string }> } };
}

// Puente entre zod y react-hook-form: corre el schema y, si falla, mapea cada issue al
// formato de errores de react-hook-form (campo -> { type, message }), quedandose con el
// primer mensaje por campo.
export function zodResolver<T extends FieldValues>(schema: ParsableSchema<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
    const fieldErrors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join('.');
      if (path && !fieldErrors[path]) fieldErrors[path] = { type: String(issue.code), message: issue.message };
    }
    return { values: {}, errors: fieldErrors as unknown as FieldErrors<T> };
  };
}

// Vuelca un mapa campo -> mensaje a los errores del formulario. Lo usamos para pintar los
// fieldErrors de un 400 del backend (ApiError.fieldErrorMap) sobre el formulario.
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  errores: Record<string, string>,
): void {
  for (const [campo, mensaje] of Object.entries(errores)) {
    setError(campo as Path<T>, { message: mensaje });
  }
}
