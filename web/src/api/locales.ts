import { http } from "./client";
import type {
  ActualizarPuntoDeVentaRequest,
  CambiarEstadoLocalRequest,
  CrearPuntoDeVentaRequest,
  PuntoDeVentaResponse,
} from "@/types";

// CRUD de locales del comercio (MAPA-FRONTEND §3.7).

export function crearLocal(
  body: CrearPuntoDeVentaRequest,
): Promise<PuntoDeVentaResponse> {
  return http.post<PuntoDeVentaResponse>(
    "/api/v1/comercio/puntos-de-venta",
    body,
  );
}

/** Los locales del gestor autenticado. */
export function listMisLocales(): Promise<PuntoDeVentaResponse[]> {
  return http.get<PuntoDeVentaResponse[]>("/api/v1/comercio/puntos-de-venta");
}

export function updateLocal(
  id: number,
  body: ActualizarPuntoDeVentaRequest,
): Promise<PuntoDeVentaResponse> {
  return http.put<PuntoDeVentaResponse>(
    `/api/v1/comercio/puntos-de-venta/${id}`,
    body,
  );
}

export function cambiarEstadoLocal(
  id: number,
  body: CambiarEstadoLocalRequest,
): Promise<PuntoDeVentaResponse> {
  return http.patch<PuntoDeVentaResponse>(
    `/api/v1/comercio/puntos-de-venta/${id}/estado`,
    body,
  );
}

/** 204. 409 si el local tiene dependencias. */
export function eliminarLocal(id: number): Promise<void> {
  return http.del(`/api/v1/comercio/puntos-de-venta/${id}`);
}
