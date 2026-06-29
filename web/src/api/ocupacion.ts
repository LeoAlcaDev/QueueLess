import { http } from "./client";
import type { OcupacionResponse } from "@/types";

// Curva de ocupación de un local (MAPA-FRONTEND §3.10). Misma forma para ambos roles.

export function getOcupacionCliente(
  puntoDeVentaId: number,
): Promise<OcupacionResponse> {
  return http.get<OcupacionResponse>(
    `/api/v1/cliente/ocupacion/${puntoDeVentaId}`,
  );
}

export function getOcupacionComercio(
  puntoDeVentaId: number,
): Promise<OcupacionResponse> {
  return http.get<OcupacionResponse>(
    `/api/v1/comercio/ocupacion/${puntoDeVentaId}`,
  );
}
