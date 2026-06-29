import { http } from "./client";
import type { ActivarRolRequest, UsuarioResponse } from "@/types";

// Usuario autenticado y activación de roles (MAPA-FRONTEND §2.4 / §3.5).

export function getMe(): Promise<UsuarioResponse> {
  return http.get<UsuarioResponse>("/api/v1/usuarios/me");
}

/** Agrega un rol (y su perfil vacío). Tras esto hay que REFRESCAR el token. */
export function activarRol(body: ActivarRolRequest): Promise<UsuarioResponse> {
  return http.post<UsuarioResponse>("/api/v1/usuarios/me/activar-rol", body);
}
