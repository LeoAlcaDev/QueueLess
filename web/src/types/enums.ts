// Enums del dominio (replican los del backend) y sus etiquetas en espanol para la
// interfaz. Todo lo que muestre un enum lee de aca, asi nadie reescribe los textos a
// mano y quedan consistentes en toda la app.

export type Rol = 'CLIENTE' | 'COMERCIO' | 'REPARTIDOR';
export type TipoEntrega = 'PICKUP' | 'DELIVERY';

export type EstadoPedido =
  | 'PENDIENTE_PAGO'
  | 'PAGADO_BUSCANDO_REPARTIDOR'
  | 'PAGADO_ESPERANDO_COMERCIO'
  | 'ACEPTADO'
  | 'EN_PREPARACION'
  | 'LISTO_PARA_RECOGER'
  | 'LISTO_PARA_DELIVERY'
  | 'ENTREGADO'
  | 'CANCELADO_POR_CLIENTE'
  | 'CANCELADO_POR_COMERCIO'
  | 'EXPIRADO';

export type Alergeno =
  | 'MANI'
  | 'FRUTOS_SECOS'
  | 'MARISCOS'
  | 'PESCADO'
  | 'LACTEOS'
  | 'HUEVO'
  | 'GLUTEN'
  | 'SOYA'
  | 'AJONJOLI';

export type RestriccionDietetica = 'VEGETARIANO' | 'VEGANO' | 'SIN_GLUTEN';
export type AptitudDietetica = 'VEGETARIANO' | 'VEGANO';
export type ToleranciaPicante = 'NINGUNA' | 'BAJA' | 'MEDIA' | 'ALTA';
export type TipoPreparacion = 'PREPARADO' | 'INSTANTANEO';
export type EstadoPago = 'PENDIENTE' | 'CONFIRMADO' | 'FALLIDO' | 'REEMBOLSADO';

export type EstadoSolicitudDelivery =
  | 'BUSCANDO'
  | 'ASIGNADO'
  | 'RECOGIDO'
  | 'ENTREGADO'
  | 'SIN_REPARTIDOR'
  | 'CANCELADO';

export type MotivoCancelacion =
  | 'PRODUCTO_AGOTADO'
  | 'FALTA_INGREDIENTE'
  | 'FUERA_DE_HORARIO_PRODUCTO'
  | 'LOCAL_SATURADO'
  | 'LOCAL_POR_CERRAR'
  | 'PROBLEMA_OPERATIVO'
  | 'OTRO'
  | 'COMERCIO_NO_ATENDIO'
  | 'COMERCIO_NO_PREPARO';

export type TipoReclamo = 'RECLAMO' | 'QUEJA';
export type DestinatarioReclamo = 'COMERCIO' | 'PLATAFORMA';
export type EstadoReclamo = 'PENDIENTE' | 'RESPONDIDO';
export type ObjetivoResena = 'PUNTO_DE_VENTA' | 'REPARTIDOR';
export type TipoMovimientoQueuePoints = 'GANADO' | 'CANJEADO' | 'EXPIRADO' | 'REVERTIDO';
// turnos del chat con el asistente
export type RolConversacion = 'USUARIO' | 'ASISTENTE';

export const ROL_LABELS: Record<Rol, string> = {
  CLIENTE: 'Cliente',
  COMERCIO: 'Comercio',
  REPARTIDOR: 'Repartidor',
};

export const TIPO_ENTREGA_LABELS: Record<TipoEntrega, string> = {
  PICKUP: 'Recojo en tienda',
  DELIVERY: 'Delivery',
};

export const ALERGENO_LABELS: Record<Alergeno, string> = {
  MANI: 'Maní',
  FRUTOS_SECOS: 'Frutos secos',
  MARISCOS: 'Mariscos',
  PESCADO: 'Pescado',
  LACTEOS: 'Lácteos',
  HUEVO: 'Huevo',
  GLUTEN: 'Gluten',
  SOYA: 'Soya',
  AJONJOLI: 'Ajonjolí',
};

export const RESTRICCION_LABELS: Record<RestriccionDietetica, string> = {
  VEGETARIANO: 'Vegetariano',
  VEGANO: 'Vegano',
  SIN_GLUTEN: 'Sin gluten',
};

export const APTITUD_LABELS: Record<AptitudDietetica, string> = {
  VEGETARIANO: 'Apto vegetariano',
  VEGANO: 'Apto vegano',
};

export const PICANTE_LABELS: Record<ToleranciaPicante, string> = {
  NINGUNA: 'Ninguna',
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
};

export const PREPARACION_LABELS: Record<TipoPreparacion, string> = {
  PREPARADO: 'Preparado',
  INSTANTANEO: 'Instantáneo (listo para servir)',
};

export const ESTADO_PAGO_LABELS: Record<EstadoPago, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  FALLIDO: 'Fallido',
  REEMBOLSADO: 'Reembolsado',
};

export const ESTADO_SOLICITUD_LABELS: Record<EstadoSolicitudDelivery, string> = {
  BUSCANDO: 'Buscando repartidor',
  ASIGNADO: 'Asignado',
  RECOGIDO: 'Recogido',
  ENTREGADO: 'Entregado',
  SIN_REPARTIDOR: 'Sin repartidor',
  CANCELADO: 'Cancelado',
};

export const MOTIVO_CANCELACION_LABELS: Record<MotivoCancelacion, string> = {
  PRODUCTO_AGOTADO: 'Producto agotado',
  FALTA_INGREDIENTE: 'Falta de ingrediente',
  FUERA_DE_HORARIO_PRODUCTO: 'Fuera de horario del producto',
  LOCAL_SATURADO: 'Local saturado',
  LOCAL_POR_CERRAR: 'Local por cerrar',
  PROBLEMA_OPERATIVO: 'Problema operativo',
  OTRO: 'Otro',
  COMERCIO_NO_ATENDIO: 'El comercio no atendió',
  COMERCIO_NO_PREPARO: 'El comercio no preparó',
};

export const TIPO_RECLAMO_LABELS: Record<TipoReclamo, string> = {
  RECLAMO: 'Reclamo',
  QUEJA: 'Queja',
};

export const DESTINATARIO_RECLAMO_LABELS: Record<DestinatarioReclamo, string> = {
  COMERCIO: 'Un comercio',
  PLATAFORMA: 'La plataforma',
};

export const OBJETIVO_RESENA_LABELS: Record<ObjetivoResena, string> = {
  PUNTO_DE_VENTA: 'Local',
  REPARTIDOR: 'Repartidor',
};

export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimientoQueuePoints, string> = {
  GANADO: 'Ganado',
  CANJEADO: 'Canjeado',
  EXPIRADO: 'Expirado',
  REVERTIDO: 'Revertido',
};

export const ESTADO_RECLAMO_LABELS: Record<EstadoReclamo, string> = {
  PENDIENTE: 'Pendiente',
  RESPONDIDO: 'Respondido',
};

// El tono mapea a los colores semanticos del sistema de diseno (badge de estado).
export type StatusTone = 'warning' | 'info' | 'brand' | 'success' | 'neutral';

export const ORDER_STATES: Record<EstadoPedido, { label: string; tone: StatusTone }> = {
  PENDIENTE_PAGO: { label: 'Pendiente de pago', tone: 'warning' },
  PAGADO_BUSCANDO_REPARTIDOR: { label: 'Buscando repartidor', tone: 'info' },
  PAGADO_ESPERANDO_COMERCIO: { label: 'Esperando al comercio', tone: 'info' },
  ACEPTADO: { label: 'Aceptado', tone: 'brand' },
  EN_PREPARACION: { label: 'En preparación', tone: 'brand' },
  LISTO_PARA_RECOGER: { label: 'Listo para recoger', tone: 'success' },
  LISTO_PARA_DELIVERY: { label: 'Listo para delivery', tone: 'success' },
  ENTREGADO: { label: 'Entregado', tone: 'success' },
  CANCELADO_POR_CLIENTE: { label: 'Cancelado', tone: 'neutral' },
  CANCELADO_POR_COMERCIO: { label: 'Cancelado por el comercio', tone: 'neutral' },
  EXPIRADO: { label: 'Expirado', tone: 'neutral' },
};

// Pasos del camino feliz para el stepper de progreso del cliente.
export const ORDER_TIMELINE: EstadoPedido[] = [
  'PENDIENTE_PAGO',
  'PAGADO_ESPERANDO_COMERCIO',
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO_PARA_RECOGER',
  'ENTREGADO',
];
