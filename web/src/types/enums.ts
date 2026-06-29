// Enums espejo del backend (valores EXACTOS — usados en formularios y badges).
// Fuente: entidades en backend/.../entity y MAPA-FRONTEND §3.

export const ROLES = ["CLIENTE", "COMERCIO", "REPARTIDOR"] as const;
export type Rol = (typeof ROLES)[number];

export const TIPOS_ENTREGA = ["PICKUP", "DELIVERY"] as const;
export type TipoEntrega = (typeof TIPOS_ENTREGA)[number];

// Los 11 estados del pedido (máquina de estados). El orden importa para la UI.
export const ESTADOS_PEDIDO = [
  "PENDIENTE_PAGO",
  "PAGADO_BUSCANDO_REPARTIDOR",
  "PAGADO_ESPERANDO_COMERCIO",
  "ACEPTADO",
  "EN_PREPARACION",
  "LISTO_PARA_RECOGER",
  "LISTO_PARA_DELIVERY",
  "ENTREGADO",
  "CANCELADO_POR_CLIENTE",
  "CANCELADO_POR_COMERCIO",
  "EXPIRADO",
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const MOTIVOS_CANCELACION = [
  "PRODUCTO_AGOTADO",
  "FALTA_INGREDIENTE",
  "FUERA_DE_HORARIO_PRODUCTO",
  "LOCAL_SATURADO",
  "LOCAL_POR_CERRAR",
  "PROBLEMA_OPERATIVO",
  "OTRO",
  "COMERCIO_NO_ATENDIO",
  "COMERCIO_NO_PREPARO",
] as const;
export type MotivoCancelacion = (typeof MOTIVOS_CANCELACION)[number];

export const ALERGENOS = [
  "MANI",
  "FRUTOS_SECOS",
  "MARISCOS",
  "PESCADO",
  "LACTEOS",
  "HUEVO",
  "GLUTEN",
  "SOYA",
  "AJONJOLI",
] as const;
export type Alergeno = (typeof ALERGENOS)[number];

export const RESTRICCIONES_DIETETICAS = [
  "VEGETARIANO",
  "VEGANO",
  "SIN_GLUTEN",
] as const;
export type RestriccionDietetica = (typeof RESTRICCIONES_DIETETICAS)[number];

export const APTITUDES_DIETETICAS = ["VEGETARIANO", "VEGANO"] as const;
export type AptitudDietetica = (typeof APTITUDES_DIETETICAS)[number];

export const TOLERANCIAS_PICANTE = [
  "NINGUNA",
  "BAJA",
  "MEDIA",
  "ALTA",
] as const;
export type ToleranciaPicante = (typeof TOLERANCIAS_PICANTE)[number];

export const TIPOS_PREPARACION = ["PREPARADO", "INSTANTANEO"] as const;
export type TipoPreparacion = (typeof TIPOS_PREPARACION)[number];

export const ESTADOS_SOLICITUD_DELIVERY = [
  "BUSCANDO",
  "ASIGNADO",
  "RECOGIDO",
  "ENTREGADO",
  "SIN_REPARTIDOR",
] as const;
export type EstadoSolicitudDelivery =
  (typeof ESTADOS_SOLICITUD_DELIVERY)[number];

export const ESTADOS_PAGO = [
  "PENDIENTE",
  "CONFIRMADO",
  "FALLIDO",
  "REEMBOLSADO",
] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const TIPOS_MOVIMIENTO = ["GANADO", "CANJEADO"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const TIPOS_RECLAMO = ["RECLAMO", "QUEJA"] as const;
export type TipoReclamo = (typeof TIPOS_RECLAMO)[number];

export const DESTINATARIOS_RECLAMO = ["COMERCIO", "PLATAFORMA"] as const;
export type DestinatarioReclamo = (typeof DESTINATARIOS_RECLAMO)[number];

export const ESTADOS_RECLAMO = ["PENDIENTE", "RESPONDIDO"] as const;
export type EstadoReclamo = (typeof ESTADOS_RECLAMO)[number];

export const OBJETIVOS_RESENA = ["PUNTO_DE_VENTA", "REPARTIDOR"] as const;
export type ObjetivoResena = (typeof OBJETIVOS_RESENA)[number];

export type RolConversacion = "USUARIO" | "ASISTENTE";
