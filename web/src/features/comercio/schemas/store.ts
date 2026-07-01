import { z } from 'zod';

// Validacion del formulario de local. Los horarios vienen de inputs time ("HH:mm") y el
// tiempo promedio declarado es en minutos. El backend acepta nombre y ubicacion siempre.
export const storeSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120, 'Máximo 120 caracteres'),
  ubicacion: z.string().trim().min(1, 'La ubicación es obligatoria').max(160, 'Máximo 160 caracteres'),
  horarioApertura: z.string().min(1, 'Indica la hora de apertura'),
  horarioCierre: z.string().min(1, 'Indica la hora de cierre'),
  tiempoPromedioDeclarado: z.coerce.number().positive('Debe ser mayor a 0'),
});

export type StoreFormValues = z.infer<typeof storeSchema>;
