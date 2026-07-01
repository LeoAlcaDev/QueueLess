import { z } from 'zod';
import type { FieldError } from '@/api/types';

// Fragmentos de validación reusables (mismas reglas que el backend). Los esquemas
// específicos de cada formulario viven en su feature.
export const emailSchema = z.string().trim().email('Ingresa un correo válido');
export const passwordSchema = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres');
export const requiredText = (mensaje = 'Este campo es obligatorio') => z.string().trim().min(1, mensaje);

// vuelca los fieldErrors del backend (en un 400) al setError de react-hook-form,
// para pintar el error debajo del campo que corresponde
export function applyFieldErrors(
  fieldErrors: FieldError[] | undefined,
  setError: (name: string, error: { message: string }) => void,
): void {
  if (!fieldErrors) return;
  for (const fe of fieldErrors) {
    setError(fe.field, { message: fe.message });
  }
}
