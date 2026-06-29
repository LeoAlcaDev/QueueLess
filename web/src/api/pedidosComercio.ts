import { http } from "./client";
import type {
  ConfirmarEntregaRequest,
  MotivoCancelacionRequest,
  PedidoResponse,
} from "@/types";

// Pedidos del comercio (MAPA-FRONTEND §3.3). La cola es List (no paginada).

export function getCola(): Promise<PedidoResponse[]> {
  return http.get<PedidoResponse[]>("/api/v1/comercio/pedidos/cola");
}

export function getPedido(id: number): Promise<PedidoResponse> {
  return http.get<PedidoResponse>(`/api/v1/comercio/pedidos/${id}`);
}

export function aceptar(id: number): Promise<PedidoResponse> {
  return http.post<PedidoResponse>(`/api/v1/comercio/pedidos/${id}/aceptar`);
}

export function iniciarPreparacion(id: number): Promise<PedidoResponse> {
  return http.post<PedidoResponse>(
    `/api/v1/comercio/pedidos/${id}/iniciar-preparacion`,
  );
}

export function marcarListo(id: number): Promise<PedidoResponse> {
  return http.post<PedidoResponse>(
    `/api/v1/comercio/pedidos/${id}/marcar-listo`,
  );
}

/** Cierra una entrega pickup con el código que muestra el cliente. */
export function marcarEntregado(
  id: number,
  body: ConfirmarEntregaRequest,
): Promise<PedidoResponse> {
  return http.post<PedidoResponse>(
    `/api/v1/comercio/pedidos/${id}/marcar-entregado`,
    body,
  );
}

export function rechazar(
  id: number,
  body: MotivoCancelacionRequest,
): Promise<PedidoResponse> {
  return http.post<PedidoResponse>(
    `/api/v1/comercio/pedidos/${id}/rechazar`,
    body,
  );
}

export function cancelar(
  id: number,
  body: MotivoCancelacionRequest,
): Promise<PedidoResponse> {
  return http.post<PedidoResponse>(
    `/api/v1/comercio/pedidos/${id}/cancelar`,
    body,
  );
}
