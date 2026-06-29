import { http } from "./client";
import type {
  ActualizarPerfilClienteRequest,
  ActualizarPerfilComercioRequest,
  ActualizarPerfilRepartidorRequest,
  PerfilClienteResponse,
  PerfilComercioResponse,
  PerfilRepartidorResponse,
  PerfilesResponse,
} from "@/types";

// Perfiles por rol (MAPA-FRONTEND §3.5).

export function getPerfiles(): Promise<PerfilesResponse> {
  return http.get<PerfilesResponse>("/api/v1/me/perfiles");
}

export function updatePerfilCliente(
  body: ActualizarPerfilClienteRequest,
): Promise<PerfilClienteResponse> {
  return http.put<PerfilClienteResponse>("/api/v1/me/perfiles/cliente", body);
}

export function updatePerfilComercio(
  body: ActualizarPerfilComercioRequest,
): Promise<PerfilComercioResponse> {
  return http.put<PerfilComercioResponse>("/api/v1/me/perfiles/comercio", body);
}

export function updatePerfilRepartidor(
  body: ActualizarPerfilRepartidorRequest,
): Promise<PerfilRepartidorResponse> {
  return http.put<PerfilRepartidorResponse>(
    "/api/v1/me/perfiles/repartidor",
    body,
  );
}
