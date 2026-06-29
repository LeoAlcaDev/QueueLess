import { http } from "./client";
import type {
  IniciarPagoRequest,
  IniciarPagoResponse,
  PagoResponse,
} from "@/types";

// Pagos del cliente (MAPA-FRONTEND §3.10). El pago se confirma async por webhook;
// el front se entera por SSE o polling de GET /cliente/pagos/{id} (§8.8).

export function iniciarPago(
  body: IniciarPagoRequest,
): Promise<IniciarPagoResponse> {
  return http.post<IniciarPagoResponse>("/api/v1/cliente/pagos/iniciar", body);
}

export function getPago(id: number): Promise<PagoResponse> {
  return http.get<PagoResponse>(`/api/v1/cliente/pagos/${id}`);
}

/** Solo dev: dispara el webhook mock que confirma el pago por referencia. */
export function dispararWebhookMock(referencia: string): Promise<PagoResponse> {
  return http.post<PagoResponse>(`/api/pago/webhook/mock`, undefined, {
    params: { referencia },
  });
}
