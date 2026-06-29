import { http } from "./client";
import type { TycEstadoResponse } from "@/types";

// Términos y condiciones (MAPA-FRONTEND §3.10 / §7.3). El gating es del front.

export function getTycEstado(): Promise<TycEstadoResponse> {
  return http.get<TycEstadoResponse>("/api/v1/me/tyc");
}

export function aceptarTyc(): Promise<TycEstadoResponse> {
  return http.post<TycEstadoResponse>("/api/v1/me/tyc/aceptacion");
}
