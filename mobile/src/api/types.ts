// Contrato de transporte del backend. Las respuestas exitosas vienen envueltas en
// ApiResponse; las listas paginadas, en PageResponse (dentro de ApiResponse); los
// errores, en ErrorResponse (sin envolver). Los tipos de dominio (enums y DTOs)
// se agregan en este mismo archivo más abajo.

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: FieldError[] | null;
}

// Roles del usuario. Una petición lleva un solo rol activo, pero el usuario puede
// tener varios (ej. cliente y repartidor a la vez).
export type Rol = 'CLIENTE' | 'COMERCIO' | 'REPARTIDOR';

// Respuesta de login/registro/refresh: trae ambos tokens y los datos básicos.
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  usuarioId: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UsuarioResponse {
  id: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface ActivarRolRequest {
  rol: Rol;
}

// Claims del access token (15 min). Los nombres de las claves los fija el backend.
export interface JwtClaims {
  sub: string;
  uid: number;
  roles: Rol[];
  type: string;
  exp: number;
}

// Evento que el backend empuja por SSE en cada cambio de estado de un pedido.
export interface PedidoEstadoEvent {
  pedidoId: number;
  estadoAnterior: string;
  estadoNuevo: string;
  puntoDeVentaId: number;
  ocurridoAt: string;
}

// Enums de dominio. Los nombres son exactos a los del backend (se mandan tal cual).

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

export type TipoEntrega = 'PICKUP' | 'DELIVERY';
export type EstadoSolicitudDelivery = 'BUSCANDO' | 'ASIGNADO' | 'RECOGIDO' | 'ENTREGADO' | 'SIN_REPARTIDOR' | 'CANCELADO';
export type EstadoPago = 'PENDIENTE' | 'CONFIRMADO' | 'FALLIDO' | 'REEMBOLSADO';
export type TipoMovimiento = 'GANADO' | 'CANJEADO';
export type Alergeno = 'MANI' | 'FRUTOS_SECOS' | 'MARISCOS' | 'PESCADO' | 'LACTEOS' | 'HUEVO' | 'GLUTEN' | 'SOYA' | 'AJONJOLI';
export type AptitudDietetica = 'VEGETARIANO' | 'VEGANO';
export type ToleranciaPicante = 'NINGUNA' | 'BAJA' | 'MEDIA' | 'ALTA';
export type TipoPreparacion = 'PREPARADO' | 'INSTANTANEO';
export type ObjetivoResena = 'PUNTO_DE_VENTA' | 'REPARTIDOR';
export type TipoReclamo = 'RECLAMO' | 'QUEJA';
export type DestinatarioReclamo = 'COMERCIO' | 'PLATAFORMA';
export type EstadoReclamo = 'PENDIENTE' | 'RESPONDIDO';
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
export type RolConversacion = 'USUARIO' | 'ASISTENTE';

// Request DTOs (campos exactos del backend).

export interface ItemPedidoRequest {
  productoId: number;
  cantidad: number;
}

export interface CrearPedidoRequest {
  puntoDeVentaId: number;
  tipoEntrega: TipoEntrega;
  zonaEntrega?: string;
  recojoProgramadoAt?: string;
  items: ItemPedidoRequest[];
}

export interface CancelarPedidoRequest {
  razon?: string;
}

export interface CrearResenaRequest {
  objetivoTipo: ObjetivoResena;
  calificacion: number;
  comentario?: string;
}

export interface IniciarPagoRequest {
  pedidoId: number;
}

export interface CanjearPuntosRequest {
  monto: number;
  referenciaTipo: string;
  referenciaId: number;
  descripcion: string;
}

export interface ConfirmarEntregaRequest {
  codigo: string;
}

export interface MotivoCancelacionRequest {
  motivo: MotivoCancelacion;
  detalle?: string;
}

export interface CrearReclamoRequest {
  tipo: TipoReclamo;
  contra: DestinatarioReclamo;
  puntoDeVentaId?: number;
  pedidoId?: number;
  detalle: string;
}

export interface ResponderReclamoRequest {
  respuesta: string;
}

// el alta y la edición de producto comparten los mismos campos; el alta suma el local
export interface ProductoRequestBase {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  tipoPreparacion: TipoPreparacion;
  alergenos: Alergeno[];
  aptitudesDieteticas: AptitudDietetica[];
  nivelPicante: ToleranciaPicante;
  horarioServicioInicio?: string;
  horarioServicioFin?: string;
  tieneVentanaDePedido: boolean;
  ventanaPedidoInicio?: string;
  ventanaPedidoFin?: string;
  ventanaRecojoInicio?: string;
  ventanaRecojoFin?: string;
  vigenciaInicio?: string;
  vigenciaFin?: string;
  aceptaProgramado: boolean;
}

export interface CrearProductoRequest extends ProductoRequestBase {
  puntoDeVentaId: number;
}

export type ActualizarProductoRequest = ProductoRequestBase;

export interface PuntoDeVentaRequest {
  nombre: string;
  ubicacion: string;
  horarioApertura: string;
  horarioCierre: string;
  tiempoPromedioDeclarado: number;
}

export interface CambiarEstadoLocalRequest {
  abierto: boolean;
}

export interface CambiarDisponibilidadRequest {
  disponible: boolean;
}

export interface TurnoConversacion {
  rol: RolConversacion;
  texto: string;
}

export interface AsistenteRequest {
  mensaje: string;
  historial?: TurnoConversacion[];
  puntoDeVentaId?: number;
}

// Restricciones dietéticas del cliente (distintas de las aptitudes del producto).
export type RestriccionDietetica = 'VEGETARIANO' | 'VEGANO' | 'SIN_GLUTEN';

// Response DTOs (campos exactos del backend). Las fechas (Instant/LocalTime/
// LocalDate) llegan como string; los montos (BigDecimal) como number.

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

export interface ActualizarPerfilClienteRequest {
  direccionPreferida?: string;
  alergias?: string;
  alergenosEvitar: Alergeno[];
  restriccionesDieteticas: RestriccionDietetica[];
  toleranciaPicante?: ToleranciaPicante;
  presupuestoReferencia?: number;
}

export interface ActualizarPerfilComercioRequest {
  ruc: string;
  contactoTelefono?: string;
  contactoEmail?: string;
}

export interface ActualizarPerfilRepartidorRequest {
  disponible: boolean;
}

export interface PuntoDeVentaResponse {
  id: number;
  nombre: string;
  ubicacion: string;
  horarioApertura: string;
  horarioCierre: string;
  tiempoEsperaEstimado: number | null;
  abierto: boolean;
  tasaCumplimiento: number | null;
}

export interface ProductoResponse {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  fotoUrl: string | null;
  categoria: string;
  tipoPreparacion: TipoPreparacion;
  disponible: boolean;
  alergenos: Alergeno[];
  aptitudesDieteticas: AptitudDietetica[];
  nivelPicante: ToleranciaPicante;
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
  disponibleAhora: boolean;
  razonNoDisponible: string | null;
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

export interface TiempoEstimadoResponse {
  minutos: number;
}

export interface FranjaOcupacion {
  diaSemana: number;
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
  busquedaInicioAt: string | null;
  busquedaFinAt: string | null;
  asignadoAt: string | null;
  recogidoAt: string | null;
  entregadoAt: string | null;
}

export interface IniciarPagoResponse {
  pagoId: number;
  pedidoId: number;
  monto: number;
  estado: EstadoPago;
  referenciaExterna: string;
  urlCheckout: string;
}

export interface PagoResponse {
  id: number;
  pedidoId: number;
  monto: number;
  metodo: string | null;
  estado: EstadoPago;
  referenciaExterna: string;
  createdAt: string;
  confirmadoAt: string | null;
  reembolsadoAt: string | null;
}

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

export interface TycEstadoResponse {
  versionVigente: string;
  versionAceptada: string | null;
  aceptadoAt: string | null;
  aceptoVersionVigente: boolean;
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

export interface AcuseReclamoResponse {
  codigoConstancia: string;
  tipo: TipoReclamo;
  contra: DestinatarioReclamo;
  estado: EstadoReclamo;
  plazoRespuestaAt: string | null;
  mensaje: string;
}
