import { z } from 'zod';

// Schemas de los formularios del area de cliente. Cada pantalla arma su request a partir
// de estos valores ya validados. El backend vuelve a validar; aca solo cuidamos lo basico
// para no mandar pedidos obviamente malos.

const ZONAS_ENTREGA = [
  'Patios centrales',
  'Biblioteca',
  'Aulas Bloque A',
  'Aulas Bloque B',
  'Aulas Bloque C',
] as const;

export const ZONAS = ZONAS_ENTREGA;

export const checkoutSchema = z
  .object({
    tipoEntrega: z.enum(['PICKUP', 'DELIVERY']),
    zonaEntrega: z.string().optional(),
    recojoProgramadoAt: z.string().optional(),
  })
  .refine((data) => data.tipoEntrega !== 'DELIVERY' || Boolean(data.zonaEntrega), {
    path: ['zonaEntrega'],
    message: 'Elige una zona de entrega para el delivery.',
  });

export type CheckoutValues = z.infer<typeof checkoutSchema>;

export const resenaSchema = z.object({
  objetivoTipo: z.enum(['PUNTO_DE_VENTA', 'REPARTIDOR']),
  calificacion: z.number().min(1, 'Elige una calificación.').max(5),
  comentario: z.string().max(500, 'El comentario es muy largo.').optional(),
});

export type ResenaValues = z.infer<typeof resenaSchema>;

export const reclamoSchema = z
  .object({
    tipo: z.enum(['RECLAMO', 'QUEJA']),
    contra: z.enum(['COMERCIO', 'PLATAFORMA']),
    puntoDeVentaId: z.string().optional(),
    pedidoId: z.string().optional(),
    detalle: z.string().min(10, 'Cuéntanos con un poco más de detalle (mínimo 10 caracteres).'),
  })
  .refine((data) => data.contra !== 'COMERCIO' || Boolean(data.puntoDeVentaId), {
    path: ['puntoDeVentaId'],
    message: 'Indica el local del reclamo.',
  });

export type ReclamoValues = z.infer<typeof reclamoSchema>;

export const perfilSchema = z.object({
  direccionPreferida: z.string().max(200).optional(),
  alergias: z.string().max(500).optional(),
  toleranciaPicante: z.enum(['NINGUNA', 'BAJA', 'MEDIA', 'ALTA']),
  presupuestoReferencia: z.string().optional(),
  alergenosEvitar: z.array(z.string()),
  restriccionesDieteticas: z.array(z.string()),
});

export type PerfilValues = z.infer<typeof perfilSchema>;
