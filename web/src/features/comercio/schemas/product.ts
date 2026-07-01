import { z } from 'zod';

const ALERGENOS = [
  'MANI',
  'FRUTOS_SECOS',
  'MARISCOS',
  'PESCADO',
  'LACTEOS',
  'HUEVO',
  'GLUTEN',
  'SOYA',
  'AJONJOLI',
] as const;
const APTITUDES = ['VEGETARIANO', 'VEGANO'] as const;
const PICANTES = ['NINGUNA', 'BAJA', 'MEDIA', 'ALTA'] as const;
const PREPARACIONES = ['PREPARADO', 'INSTANTANEO'] as const;

// Validacion del formulario de producto. Los campos opcionales de horario/ventana/vigencia
// salen vacios y se convierten a null al armar el request. El precio se topa en 9999.99.
export const productSchema = z.object({
  puntoDeVentaId: z.coerce.number().positive('Selecciona un local'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120, 'Máximo 120 caracteres'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
  precio: z.coerce.number().positive('Debe ser mayor a 0').max(9999.99, 'Máximo S/ 9999.99'),
  categoria: z.string().trim().max(60, 'Máximo 60 caracteres').optional(),
  tipoPreparacion: z.enum(PREPARACIONES),
  alergenos: z.array(z.enum(ALERGENOS)),
  aptitudesDieteticas: z.array(z.enum(APTITUDES)),
  nivelPicante: z.enum(PICANTES),
  aceptaProgramado: z.boolean(),
  tieneVentanaDePedido: z.boolean(),
  horarioServicioInicio: z.string().optional(),
  horarioServicioFin: z.string().optional(),
  ventanaPedidoInicio: z.string().optional(),
  ventanaPedidoFin: z.string().optional(),
  ventanaRecojoInicio: z.string().optional(),
  ventanaRecojoFin: z.string().optional(),
  vigenciaInicio: z.string().optional(),
  vigenciaFin: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
