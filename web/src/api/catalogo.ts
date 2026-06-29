import { http } from "./client";
import type {
  Page,
  PageParams,
  ProductoResponse,
  PuntoDeVentaResponse,
  ResenaResponse,
  TiempoEstimadoResponse,
} from "@/types";

// Catálogo público (MAPA-FRONTEND §3.6). Sin login.

/** Solo locales abiertos. */
export function listPuntosDeVenta(): Promise<PuntoDeVentaResponse[]> {
  return http.get<PuntoDeVentaResponse[]>("/api/v1/puntos-de-venta");
}

export function getPuntoDeVenta(id: number): Promise<PuntoDeVentaResponse> {
  return http.get<PuntoDeVentaResponse>(`/api/v1/puntos-de-venta/${id}`);
}

export function getProductos(
  puntoDeVentaId: number,
): Promise<ProductoResponse[]> {
  return http.get<ProductoResponse[]>(
    `/api/v1/puntos-de-venta/${puntoDeVentaId}/productos`,
  );
}

export function getTiempoEstimado(
  puntoDeVentaId: number,
): Promise<TiempoEstimadoResponse> {
  return http.get<TiempoEstimadoResponse>(
    `/api/v1/puntos-de-venta/${puntoDeVentaId}/tiempo-estimado`,
  );
}

export function getResenasLocal(
  puntoDeVentaId: number,
  params?: PageParams,
): Promise<Page<ResenaResponse>> {
  return http.get<Page<ResenaResponse>>(
    `/api/v1/puntos-de-venta/${puntoDeVentaId}/resenas`,
    { params },
  );
}

export function getResenasRepartidor(
  repartidorId: number,
  params?: PageParams,
): Promise<Page<ResenaResponse>> {
  return http.get<Page<ResenaResponse>>(
    `/api/v1/repartidores/${repartidorId}/resenas`,
    { params },
  );
}
