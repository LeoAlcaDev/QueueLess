import { http } from "./client";
import type {
  CancelarPedidoRequest,
  CrearPedidoRequest,
  Page,
  PageParams,
  PedidoResponse,
  SolicitudDeliveryResponse,
} from "@/types";

// Pedidos del cliente (MAPA-FRONTEND §3.2). El QR se baja con lib/qr.ts.

export function crearPedido(body: CrearPedidoRequest): Promise<PedidoResponse> {
  return http.post<PedidoResponse>("/api/v1/cliente/pedidos", body);
}

export function listMisPedidos(
  params?: PageParams,
): Promise<Page<PedidoResponse>> {
  return http.get<Page<PedidoResponse>>("/api/v1/cliente/pedidos", { params });
}

export function getPedido(id: number): Promise<PedidoResponse> {
  return http.get<PedidoResponse>(`/api/v1/cliente/pedidos/${id}`);
}

export function cancelarPedido(
  id: number,
  body?: CancelarPedidoRequest,
): Promise<PedidoResponse> {
  return http.post<PedidoResponse>(
    `/api/v1/cliente/pedidos/${id}/cancelar`,
    body ?? {},
  );
}

export function reintentarBusquedaDelivery(
  id: number,
): Promise<SolicitudDeliveryResponse> {
  return http.post<SolicitudDeliveryResponse>(
    `/api/v1/cliente/pedidos/${id}/solicitud-delivery/reintentar`,
  );
}

export function cambiarAPickup(id: number): Promise<PedidoResponse> {
  return http.post<PedidoResponse>(
    `/api/v1/cliente/pedidos/${id}/cambiar-a-pickup`,
  );
}
