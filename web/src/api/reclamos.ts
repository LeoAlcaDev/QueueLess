import { http } from "./client";
import type {
  AcuseReclamoResponse,
  CrearReclamoRequest,
  ReclamoResponse,
  ResponderReclamoRequest,
} from "@/types";

// Reclamos (MAPA-FRONTEND §3.10). Contra COMERCIO exige puntoDeVentaId.

export function crearReclamo(
  body: CrearReclamoRequest,
): Promise<AcuseReclamoResponse> {
  return http.post<AcuseReclamoResponse>("/api/v1/reclamos", body);
}

export function listMisReclamos(): Promise<ReclamoResponse[]> {
  return http.get<ReclamoResponse[]>("/api/v1/reclamos/mios");
}

export function listReclamosComercio(): Promise<ReclamoResponse[]> {
  return http.get<ReclamoResponse[]>("/api/v1/comercio/reclamos");
}

/** 422 si el reclamo ya fue respondido. */
export function responderReclamo(
  id: number,
  body: ResponderReclamoRequest,
): Promise<ReclamoResponse> {
  return http.post<ReclamoResponse>(
    `/api/v1/comercio/reclamos/${id}/responder`,
    body,
  );
}
