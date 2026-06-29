import { http } from "./client";
import type { CrearResenaRequest, ResenaResponse } from "@/types";

// Reseñas (MAPA-FRONTEND §3.10). Solo si el pedido está ENTREGADO; 422 si ya reseñó.

export function crearResena(
  pedidoId: number,
  body: CrearResenaRequest,
): Promise<ResenaResponse> {
  return http.post<ResenaResponse>(
    `/api/v1/cliente/pedidos/${pedidoId}/resenas`,
    body,
  );
}
