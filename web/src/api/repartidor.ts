import { http } from "./client";
import type {
  ConfirmarEntregaRequest,
  Page,
  PageParams,
  SolicitudDeliveryResponse,
} from "@/types";

// Delivery del repartidor (MAPA-FRONTEND §3.9).

/** Solicitudes en BUSCANDO. */
export function listDisponibles(): Promise<SolicitudDeliveryResponse[]> {
  return http.get<SolicitudDeliveryResponse[]>(
    "/api/v1/repartidor/pedidos-disponibles",
  );
}

export function listMisEntregas(
  params?: PageParams,
): Promise<Page<SolicitudDeliveryResponse>> {
  return http.get<Page<SolicitudDeliveryResponse>>(
    "/api/v1/repartidor/mis-entregas",
    { params },
  );
}

export function getSolicitud(id: number): Promise<SolicitudDeliveryResponse> {
  return http.get<SolicitudDeliveryResponse>(
    `/api/v1/repartidor/solicitudes/${id}`,
  );
}

/** 422 si otro repartidor la tomó → refrescar la lista. */
export function aceptarSolicitud(
  id: number,
): Promise<SolicitudDeliveryResponse> {
  return http.post<SolicitudDeliveryResponse>(
    `/api/v1/repartidor/solicitudes/${id}/aceptar`,
  );
}

export function confirmarRecogida(
  id: number,
): Promise<SolicitudDeliveryResponse> {
  return http.post<SolicitudDeliveryResponse>(
    `/api/v1/repartidor/solicitudes/${id}/confirmar-recogida`,
  );
}

/** Cierra la entrega con el código del cliente (+50 QPts). 422 si no coincide. */
export function confirmarEntrega(
  id: number,
  body: ConfirmarEntregaRequest,
): Promise<SolicitudDeliveryResponse> {
  return http.post<SolicitudDeliveryResponse>(
    `/api/v1/repartidor/solicitudes/${id}/confirmar-entrega`,
    body,
  );
}
