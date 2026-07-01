// DTOs de request del backend. Las areas arman estos cuerpos (a menudo con react-hook-form
// y zod) y los mandan tal cual. Los campos opcionales reflejan los que el backend no exige.
import type {
  Alergeno,
  AptitudDietetica,
  DestinatarioReclamo,
  MotivoCancelacion,
  ObjetivoResena,
  RestriccionDietetica,
  Rol,
  RolConversacion,
  TipoEntrega,
  TipoPreparacion,
  TipoReclamo,
  ToleranciaPicante,
} from './enums';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface ItemPedidoRequest {
  productoId: number;
  cantidad: number;
}

export interface CrearPedidoRequest {
  puntoDeVentaId: number;
  tipoEntrega: TipoEntrega;
  zonaEntrega?: string | null;
  recojoProgramadoAt?: string | null;
  items: ItemPedidoRequest[];
}

export interface CancelarPedidoRequest {
  razon?: string | null;
}

export interface MotivoCancelacionRequest {
  motivo: MotivoCancelacion;
  detalle?: string | null;
}

export interface ConfirmarEntregaRequest {
  codigo: string;
}

export interface CrearProductoRequest {
  puntoDeVentaId: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  categoria?: string | null;
  tipoPreparacion: TipoPreparacion;
  alergenos?: Alergeno[];
  aptitudesDieteticas?: AptitudDietetica[];
  nivelPicante?: ToleranciaPicante | null;
  horarioServicioInicio?: string | null;
  horarioServicioFin?: string | null;
  tieneVentanaDePedido?: boolean;
  ventanaPedidoInicio?: string | null;
  ventanaPedidoFin?: string | null;
  ventanaRecojoInicio?: string | null;
  ventanaRecojoFin?: string | null;
  vigenciaInicio?: string | null;
  vigenciaFin?: string | null;
  aceptaProgramado?: boolean;
}

export type ActualizarProductoRequest = Omit<CrearProductoRequest, 'puntoDeVentaId'>;

export interface CambiarDisponibilidadRequest {
  disponible: boolean;
}

export interface CrearPuntoDeVentaRequest {
  nombre: string;
  ubicacion: string;
  horarioApertura?: string | null;
  horarioCierre?: string | null;
  tiempoPromedioDeclarado?: number | null;
}

export type ActualizarPuntoDeVentaRequest = CrearPuntoDeVentaRequest;

export interface CambiarEstadoLocalRequest {
  abierto: boolean;
}

export interface ActualizarPerfilClienteRequest {
  direccionPreferida?: string | null;
  alergias?: string | null;
  alergenosEvitar?: Alergeno[];
  restriccionesDieteticas?: RestriccionDietetica[];
  toleranciaPicante?: ToleranciaPicante | null;
  presupuestoReferencia?: number | null;
}

export interface ActualizarPerfilComercioRequest {
  ruc: string;
  contactoTelefono?: string | null;
  contactoEmail?: string | null;
}

export interface ActualizarPerfilRepartidorRequest {
  disponible: boolean;
}

export interface ActivarRolRequest {
  rol: Rol;
}

export interface IniciarPagoRequest {
  pedidoId: number;
}

export interface CrearResenaRequest {
  objetivoTipo: ObjetivoResena;
  calificacion: number;
  comentario?: string | null;
}

export interface CrearReclamoRequest {
  tipo: TipoReclamo;
  contra: DestinatarioReclamo;
  puntoDeVentaId?: number | null;
  pedidoId?: number | null;
  detalle: string;
}

export interface ResponderReclamoRequest {
  respuesta: string;
}

export interface CanjearPuntosRequest {
  monto: number;
  referenciaTipo: string;
  referenciaId: number;
  descripcion?: string | null;
}

export interface TurnoConversacion {
  rol: RolConversacion;
  texto: string;
}

export interface AsistenteRequest {
  mensaje: string;
  historial?: TurnoConversacion[];
  puntoDeVentaId?: number | null;
}
