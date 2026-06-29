// DTOs espejo del backend. Convenciones de serialización (Jackson por defecto):
//   BigDecimal -> number · Instant -> string ISO · LocalTime -> "HH:mm:ss"
//   LocalDate -> "YYYY-MM-DD" · Short -> number.
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
  Rol,
  RolConversacion,
  TipoEntrega,
  TipoMovimiento,
  TipoPreparacion,
  TipoReclamo,
  ToleranciaPicante,
} from "./enums";

// ----------------------------------------------------------------------------
// Perfiles
// ----------------------------------------------------------------------------
export interface PerfilClienteResponse {
  direccionPreferida: string | null;
  alergias: string | null;
  alergenosEvitar: Alergeno[] | null;
  restriccionesDieteticas: RestriccionDietetica[] | null;
  toleranciaPicante: ToleranciaPicante | null;
  presupuestoReferencia: number | null;
  totalPedidos: number | null;
}

export interface PerfilComercioResponse {
  ruc: string | null;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  /** null cuando aún no hay datos suficientes (ADR-0026). */
  tasaCumplimiento: number | null;
}

export interface PerfilRepartidorResponse {
  calificacionPromedio: number | null;
  totalEntregas: number | null;
  disponible: boolean | null;
}

export interface PerfilesResponse {
  cliente: PerfilClienteResponse | null;
  comercio: PerfilComercioResponse | null;
  repartidor: PerfilRepartidorResponse | null;
}

export interface ActualizarPerfilClienteRequest {
  direccionPreferida?: string;
  alergias?: string;
  alergenosEvitar?: Alergeno[];
  restriccionesDieteticas?: RestriccionDietetica[];
  toleranciaPicante?: ToleranciaPicante;
  presupuestoReferencia?: number;
}

export interface ActualizarPerfilComercioRequest {
  /** RUC peruano: 11 dígitos, empieza con 10 o 20. Obligatorio. */
  ruc: string;
  contactoTelefono?: string;
  contactoEmail?: string;
}

export interface ActualizarPerfilRepartidorRequest {
  disponible: boolean;
}

// ----------------------------------------------------------------------------
// Catálogo: locales y productos
// ----------------------------------------------------------------------------
export interface PuntoDeVentaResponse {
  id: number;
  nombre: string;
  ubicacion: string;
  horarioApertura: string | null;
  horarioCierre: string | null;
  tiempoEsperaEstimado: number | null;
  abierto: boolean;
  tasaCumplimiento: number | null;
}

export interface ProductoResponse {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  fotoUrl: string | null;
  categoria: string | null;
  tipoPreparacion: TipoPreparacion;
  disponible: boolean;
  alergenos: Alergeno[] | null;
  aptitudesDieteticas: AptitudDietetica[] | null;
  nivelPicante: ToleranciaPicante | null;
  horarioServicioInicio: string | null;
  horarioServicioFin: string | null;
  tieneVentanaDePedido: boolean | null;
  ventanaPedidoInicio: string | null;
  ventanaPedidoFin: string | null;
  ventanaRecojoInicio: string | null;
  ventanaRecojoFin: string | null;
  vigenciaInicio: string | null;
  vigenciaFin: string | null;
  aceptaProgramado: boolean | null;
  // Derivados (calculados con la hora de Lima).
  disponibleAhora: boolean | null;
  razonNoDisponible: string | null;
}

export interface TiempoEstimadoResponse {
  minutos: number;
}

export interface CrearPuntoDeVentaRequest {
  nombre: string;
  ubicacion: string;
  horarioApertura?: string;
  horarioCierre?: string;
  tiempoPromedioDeclarado?: number;
}

export type ActualizarPuntoDeVentaRequest = CrearPuntoDeVentaRequest;

export interface CambiarEstadoLocalRequest {
  abierto: boolean;
}

export interface CrearProductoRequest {
  puntoDeVentaId: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  tipoPreparacion: TipoPreparacion;
  alergenos?: Alergeno[];
  aptitudesDieteticas?: AptitudDietetica[];
  nivelPicante?: ToleranciaPicante;
  horarioServicioInicio?: string;
  horarioServicioFin?: string;
  tieneVentanaDePedido?: boolean;
  ventanaPedidoInicio?: string;
  ventanaPedidoFin?: string;
  ventanaRecojoInicio?: string;
  ventanaRecojoFin?: string;
  vigenciaInicio?: string;
  vigenciaFin?: string;
  aceptaProgramado?: boolean;
}

/** Igual que CrearProductoRequest pero sin puntoDeVentaId (el producto no se mueve de local). */
export type ActualizarProductoRequest = Omit<
  CrearProductoRequest,
  "puntoDeVentaId"
>;

export interface CambiarDisponibilidadRequest {
  disponible: boolean;
}

// ----------------------------------------------------------------------------
// Pedidos
// ----------------------------------------------------------------------------
export interface ItemPedidoRequest {
  productoId: number;
  /** ≥ 1. */
  cantidad: number;
}

export interface CrearPedidoRequest {
  puntoDeVentaId: number;
  tipoEntrega: TipoEntrega;
  /** requerido solo si tipoEntrega = DELIVERY. */
  zonaEntrega?: string;
  /** si viene, es pedido programado (solo PICKUP). */
  recojoProgramadoAt?: string;
  items: ItemPedidoRequest[];
}

export interface ItemPedidoResponse {
  id: number;
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PedidoResponse {
  id: number;
  codigo: string;
  estado: EstadoPedido;
  tipoEntrega: TipoEntrega;
  recojoProgramadoAt: string | null;
  puntoDeVentaId: number;
  subtotal: number;
  descuentoQpts: number;
  total: number;
  items: ItemPedidoResponse[];
  creadoAt: string;
  pagadoAt: string | null;
  aceptadoAt: string | null;
  listoAt: string | null;
  entregadoAt: string | null;
  canceladoAt: string | null;
  motivoCancelacion: MotivoCancelacion | null;
  detalleCancelacion: string | null;
}

/** Cliente: cancelar (razón opcional). */
export interface CancelarPedidoRequest {
  razon?: string;
}

/** Comercio: rechazar/cancelar. Si motivo = OTRO, detalle obligatorio (10–200). */
export interface MotivoCancelacionRequest {
  motivo: MotivoCancelacion;
  detalle?: string;
}

/** Código de entrega que la contraparte valida al cerrar el pedido. */
export interface ConfirmarEntregaRequest {
  codigo: string;
}

// ----------------------------------------------------------------------------
// Delivery (repartidor)
// ----------------------------------------------------------------------------
export interface SolicitudDeliveryResponse {
  id: number;
  pedidoId: number;
  puntoDeVentaId: number;
  puntoDeVentaNombre: string;
  puntoDeVentaUbicacion: string;
  zonaEntrega: string | null;
  estado: EstadoSolicitudDelivery;
  repartidorId: number | null;
  busquedaInicioAt: string | null;
  busquedaFinAt: string | null;
  asignadoAt: string | null;
  recogidoAt: string | null;
  entregadoAt: string | null;
}

// ----------------------------------------------------------------------------
// Pagos
// ----------------------------------------------------------------------------
export interface IniciarPagoRequest {
  pedidoId: number;
}

export interface IniciarPagoResponse {
  pagoId: number;
  pedidoId: number;
  monto: number;
  estado: EstadoPago;
  referenciaExterna: string | null;
  urlCheckout: string | null;
}

export interface PagoResponse {
  id: number;
  pedidoId: number;
  monto: number;
  metodo: string | null;
  estado: EstadoPago;
  referenciaExterna: string | null;
  createdAt: string;
  confirmadoAt: string | null;
  reembolsadoAt: string | null;
}

// ----------------------------------------------------------------------------
// QueuePoints
// ----------------------------------------------------------------------------
export interface SaldoResponse {
  usuarioId: number;
  saldo: number;
}

export interface MovimientoResponse {
  id: number;
  tipo: TipoMovimiento;
  monto: number;
  referenciaTipo: string | null;
  referenciaId: number | null;
  descripcion: string | null;
  createdAt: string;
}

export interface CanjearPuntosRequest {
  monto: number;
  referenciaTipo: string;
  referenciaId: number;
  descripcion?: string;
}

// ----------------------------------------------------------------------------
// Reseñas
// ----------------------------------------------------------------------------
export interface CrearResenaRequest {
  objetivoTipo: ObjetivoResena;
  /** 1–5. */
  calificacion: number;
  comentario?: string;
}

export interface ResenaResponse {
  id: number;
  pedidoId: number;
  autorId: number;
  autorNombre: string;
  objetivoTipo: ObjetivoResena;
  objetivoId: number;
  calificacion: number;
  comentario: string | null;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Reclamos
// ----------------------------------------------------------------------------
export interface CrearReclamoRequest {
  tipo: TipoReclamo;
  contra: DestinatarioReclamo;
  /** obligatorio cuando contra = COMERCIO. */
  puntoDeVentaId?: number;
  pedidoId?: number;
  detalle: string;
}

export interface AcuseReclamoResponse {
  codigoConstancia: string;
  tipo: TipoReclamo;
  contra: DestinatarioReclamo;
  estado: EstadoReclamo;
  plazoRespuestaAt: string | null;
  mensaje: string;
}

export interface ReclamoResponse {
  id: number;
  codigoConstancia: string;
  tipo: TipoReclamo;
  contra: DestinatarioReclamo;
  puntoDeVentaId: number | null;
  pedidoId: number | null;
  detalle: string;
  estado: EstadoReclamo;
  respuesta: string | null;
  respondidoAt: string | null;
  plazoRespuestaAt: string | null;
  creadoAt: string;
}

export interface ResponderReclamoRequest {
  respuesta: string;
}

// ----------------------------------------------------------------------------
// TyC
// ----------------------------------------------------------------------------
export interface TycEstadoResponse {
  versionVigente: string;
  versionAceptada: string | null;
  aceptadoAt: string | null;
  aceptoVersionVigente: boolean;
}

// ----------------------------------------------------------------------------
// Ocupación
// ----------------------------------------------------------------------------
export interface FranjaOcupacion {
  /** 1=lunes .. 7=domingo. */
  diaSemana: number;
  /** 0–23, zona Lima. */
  hora: number;
  suficientesDatos: boolean;
  pedidosTipicos: number | null;
  minutosEstimados: number | null;
}

export interface OcupacionResponse {
  puntoDeVentaId: number;
  nombre: string;
  ventanaDias: number;
  hayDatosSuficientes: boolean;
  minutosAhora: number;
  mensaje: string | null;
  franjas: FranjaOcupacion[];
}

// ----------------------------------------------------------------------------
// Asistente (recomendador)
// ----------------------------------------------------------------------------
export interface TurnoConversacion {
  rol: RolConversacion;
  texto: string;
}

export interface AsistenteRequest {
  mensaje: string;
  historial?: TurnoConversacion[];
  puntoDeVentaId?: number;
}

export interface RecomendacionItem {
  productoId: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  puntoDeVentaId: number;
  puntoDeVentaNombre: string;
  minutosEstimados: number;
  dentroDePresupuesto: boolean;
}

export interface AsistenteResponse {
  /** false = el modelo no respondió; igual viene la lista segura + aviso. */
  asistenteDisponible: boolean;
  explicacion: string | null;
  aviso: string | null;
  recomendaciones: RecomendacionItem[];
}

// ----------------------------------------------------------------------------
// SSE
// ----------------------------------------------------------------------------
/** Evento `pedido-estado` del stream SSE (cliente y comercio). */
export interface CambioEstadoSse {
  pedidoId: number;
  estadoAnterior: EstadoPedido;
  estadoNuevo: EstadoPedido;
  puntoDeVentaId: number;
  ocurridoAt: string;
}

// Rol que figura en la sesión (alias re-exportado por conveniencia).
export type { Rol };
