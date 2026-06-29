import { http } from "./client";
import type {
  CanjearPuntosRequest,
  MovimientoResponse,
  Page,
  PageParams,
  SaldoResponse,
} from "@/types";

// QueuePoints (MAPA-FRONTEND §3.10).

export function getSaldo(): Promise<SaldoResponse> {
  return http.get<SaldoResponse>("/api/v1/me/queuepoints/saldo");
}

export function getMovimientos(
  params?: PageParams,
): Promise<Page<MovimientoResponse>> {
  return http.get<Page<MovimientoResponse>>(
    "/api/v1/me/queuepoints/movimientos",
    { params },
  );
}

/** 422 "Saldo insuficiente..." trae el saldo actual en el mensaje. */
export function canjear(
  body: CanjearPuntosRequest,
): Promise<MovimientoResponse> {
  return http.post<MovimientoResponse>("/api/v1/me/queuepoints/canjear", body);
}
