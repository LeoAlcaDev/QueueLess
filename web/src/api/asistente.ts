import { http } from "./client";
import type { AsistenteRequest, AsistenteResponse } from "@/types";

// Asistente / chat (MAPA-FRONTEND §3.10). SIEMPRE responde 200: si la IA cae,
// asistenteDisponible=false + aviso + lista segura. Único error: 400 si mensaje vacío.

export function preguntarAsistente(
  body: AsistenteRequest,
): Promise<AsistenteResponse> {
  return http.post<AsistenteResponse>("/api/v1/cliente/asistente", body);
}
