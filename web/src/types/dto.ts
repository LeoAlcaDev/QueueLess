// DTOs de respuesta del backend, espejo de los del Spring Boot. Son compartidos por todas
// las areas, asi nadie redefine su propio Pedido o Producto. Equivalencias de tipos: los
// Instant/LocalDateTime llegan como string ISO, LocalTime como "HH:mm:ss", LocalDate como
// "YYYY-MM-DD", y BigDecimal y los enteros como number.
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
  TipoEntrega,
  TipoMovimientoQueuePoints,
  TipoPreparacion,
  TipoReclamo,
  ToleranciaPicante,
} from './enums';

export interface UsuarioResponse {
  id: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface PerfilClienteResponse {
  direccionPreferida: string | null;
  alergias: string | null;
  alergenosEvitar: Alergeno[];
  restriccionesDieteticas: RestriccionDietetica[];
  toleranciaPicante: ToleranciaPicante | null;
  presupuestoReferencia: number | null;
  totalPedidos: number;
}

export interface PerfilComercioResponse {
  ruc: string;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  tasaCumplimiento: number | null;
}

export interface PerfilRepartidorResponse {
  calificacionPromedio: number | null;
  totalEntregas: number;
  disponible: boolean;
}

export interface PerfilesResponse {
  cliente: PerfilClienteResponse | null;
  comercio: PerfilComercioResponse | null;
  repartidor: PerfilRepartidorResponse | null;
}

export interface PuntoDeVentaResponse {
  id: number;
  nombre: string;
  ubicacion: string;
  horarioApertura: string | null;
  horarioCierre: string | null;
  tiempoEsperaEstimado: number;
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
  alergenos: Alergeno[];
  aptitudesDieteticas: AptitudDietetica[];
  nivelPicante: ToleranciaPicante | null;
  horarioServicioInicio: string | null;
  horarioServicioFin: string | null;
  tieneVentanaDePedido: boolean;
  ventanaPedidoInicio: string | null;
  ventanaPedidoFin: string | null;
  ventanaRecojoInicio: string | null;
  ventanaRecojoFin: string | null;
  vigenciaInicio: string | null;
  vigenciaFin: string | null;
  aceptaProgramado: boolean;
  // derivados del backend: si se puede pedir ahora y, si no, por que
  disponibleAhora: boolean;
  razonNoDisponible: string | null;
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

export interface SolicitudDeliveryResponse {
  id: number;
  pedidoId: number;
  puntoDeVentaId: number;
  puntoDeVentaNombre: string;
  puntoDeVentaUbicacion: string;
  zonaEntrega: string;
  estado: EstadoSolicitudDelivery;
  repartidorId: number | null;
  busquedaInicioAt: string;
  busquedaFinAt: string | null;
  asignadoAt: string | null;
  recogidoAt: string | null;
  entregadoAt: string | null;
}

export interface PagoResponse {
  id: number;
  pedidoId: number;
  monto: number;
  metodo: string;
  estado: EstadoPago;
  referenciaExterna: string;
  createdAt: string;
  confirmadoAt: string | null;
  reembolsadoAt: string | null;
}

export interface IniciarPagoResponse {
  pagoId: number;
  pedidoId: number;
  monto: number;
  estado: EstadoPago;
  referenciaExterna: string;
  urlCheckout: string;
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
  plazoRespuestaAt: string;
  creadoAt: string;
}

export interface AcuseReclamoResponse {
  codigoConstancia: string;
  tipo: TipoReclamo;
  contra: DestinatarioReclamo;
  estado: EstadoReclamo;
  plazoRespuestaAt: string;
  mensaje: string;
}

export interface MovimientoResponse {
  id: number;
  tipo: TipoMovimientoQueuePoints;
  monto: number;
  referenciaTipo: string | null;
  referenciaId: number | null;
  descripcion: string | null;
  createdAt: string;
}

export interface SaldoResponse {
  usuarioId: number;
  saldo: number;
}

export interface RecomendacionItem {
  productoId: number;
  nombre: string;
  descripcion: string;
  precio: number;
  puntoDeVentaId: number;
  puntoDeVentaNombre: string;
  minutosEstimados: number;
  dentroDePresupuesto: boolean;
}

export interface AsistenteResponse {
  asistenteDisponible: boolean;
  explicacion: string | null;
  aviso: string | null;
  recomendaciones: RecomendacionItem[];
}

export interface TycEstadoResponse {
  versionVigente: string;
  versionAceptada: string | null;
  aceptadoAt: string | null;
  aceptoVersionVigente: boolean;
}

export interface FranjaOcupacion {
  diaSemana: number; // 1 = lunes ... 7 = domingo
  hora: number; // 0 a 23
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
