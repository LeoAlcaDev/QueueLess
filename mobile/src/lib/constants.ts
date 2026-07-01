import type { StatusTone } from './styles';
import type {
  Alergeno,
  AptitudDietetica,
  DestinatarioReclamo,
  EstadoPago,
  EstadoPedido,
  EstadoReclamo,
  EstadoSolicitudDelivery,
  MotivoCancelacion,
  ObjetivoResena,
  RestriccionDietetica,
  TipoEntrega,
  TipoMovimiento,
  TipoPreparacion,
  TipoReclamo,
  ToleranciaPicante,
} from '@/api/types';

// Etiquetas en español y tonos por estado, en un solo lugar para que toda la app
// muestre lo mismo. Salen del catálogo del diseño y del dominio del backend.

export const ORDER_STATE_LABELS: Record<EstadoPedido, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO_BUSCANDO_REPARTIDOR: 'Buscando repartidor',
  PAGADO_ESPERANDO_COMERCIO: 'Esperando al comercio',
  ACEPTADO: 'Aceptado',
  EN_PREPARACION: 'En preparación',
  LISTO_PARA_RECOGER: 'Listo para recoger',
  LISTO_PARA_DELIVERY: 'Listo para delivery',
  ENTREGADO: 'Entregado',
  CANCELADO_POR_CLIENTE: 'Cancelado',
  CANCELADO_POR_COMERCIO: 'Cancelado por el comercio',
  EXPIRADO: 'Expirado',
};

export const ORDER_STATE_TONE: Record<EstadoPedido, StatusTone> = {
  PENDIENTE_PAGO: 'warning',
  PAGADO_BUSCANDO_REPARTIDOR: 'info',
  PAGADO_ESPERANDO_COMERCIO: 'info',
  ACEPTADO: 'brand',
  EN_PREPARACION: 'brand',
  LISTO_PARA_RECOGER: 'success',
  LISTO_PARA_DELIVERY: 'success',
  ENTREGADO: 'success',
  CANCELADO_POR_CLIENTE: 'neutral',
  CANCELADO_POR_COMERCIO: 'neutral',
  EXPIRADO: 'neutral',
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

export const APTITUD_LABELS: Record<AptitudDietetica, string> = {
  VEGETARIANO: 'Apto vegetariano',
  VEGANO: 'Apto vegano',
};

export const RESTRICCION_LABELS: Record<RestriccionDietetica, string> = {
  VEGETARIANO: 'Vegetariano',
  VEGANO: 'Vegano',
  SIN_GLUTEN: 'Sin gluten',
};

export const PICANTE_LABELS: Record<ToleranciaPicante, string> = {
  NINGUNA: 'Ninguna',
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
};

export const PREPARACION_LABELS: Record<TipoPreparacion, string> = {
  PREPARADO: 'Preparado',
  INSTANTANEO: 'Listo para servir',
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

export const ESTADO_SOLICITUD_TONE: Record<EstadoSolicitudDelivery, StatusTone> = {
  BUSCANDO: 'info',
  ASIGNADO: 'brand',
  RECOGIDO: 'brand',
  ENTREGADO: 'success',
  SIN_REPARTIDOR: 'warning',
  CANCELADO: 'neutral',
};

export const MOVIMIENTO_LABELS: Record<TipoMovimiento, string> = {
  GANADO: 'Ganado',
  CANJEADO: 'Canjeado',
};

export const TIPO_RECLAMO_LABELS: Record<TipoReclamo, string> = {
  RECLAMO: 'Reclamo',
  QUEJA: 'Queja',
};

export const DESTINATARIO_LABELS: Record<DestinatarioReclamo, string> = {
  COMERCIO: 'Un comercio',
  PLATAFORMA: 'La plataforma',
};

export const ESTADO_RECLAMO_LABELS: Record<EstadoReclamo, string> = {
  PENDIENTE: 'Pendiente',
  RESPONDIDO: 'Respondido',
};

export const OBJETIVO_RESENA_LABELS: Record<ObjetivoResena, string> = {
  PUNTO_DE_VENTA: 'Local',
  REPARTIDOR: 'Repartidor',
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

// estados en los que el pedido ya no cambia, para decidir qué acciones ofrecer
export const ESTADOS_TERMINALES: EstadoPedido[] = [
  'ENTREGADO',
  'CANCELADO_POR_CLIENTE',
  'CANCELADO_POR_COMERCIO',
  'EXPIRADO',
];

export function isEstadoTerminal(estado: EstadoPedido): boolean {
  return ESTADOS_TERMINALES.includes(estado);
}

// color del tiempo de espera: rápido verde, medio ámbar, lento rojo
export function waitTone(minutes: number): StatusTone {
  if (minutes <= 10) return 'success';
  if (minutes <= 20) return 'warning';
  return 'error';
}

// motivos que el comercio puede elegir al rechazar o cancelar un pedido
export const MOTIVOS_COMERCIO: MotivoCancelacion[] = [
  'PRODUCTO_AGOTADO',
  'FALTA_INGREDIENTE',
  'FUERA_DE_HORARIO_PRODUCTO',
  'LOCAL_SATURADO',
  'LOCAL_POR_CERRAR',
  'PROBLEMA_OPERATIVO',
  'OTRO',
];

export const ZONAS_ENTREGA = [
  'Patios centrales',
  'Biblioteca',
  'Aulas Bloque A',
  'Aulas Bloque B',
  'Aulas Bloque C',
];
