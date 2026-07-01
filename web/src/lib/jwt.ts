// Lee los claims de un JWT sin libreria. Del lado del cliente solo nos interesa el exp
// (para decidir cuando refrescar) y los roles; la firma la valida el backend, aca no.
export interface JwtPayload {
  sub?: string;
  uid?: number;
  roles?: string[];
  type?: string;
  exp?: number;
  iat?: number;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

// true si el token ya vencio, o esta por vencer dentro del margen. Ese margen cubre el
// desfase de reloj para no mandar un request que el server vaya a rechazar por 403.
export function isExpired(token: string, skewSeconds = 10): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  const now = Date.now() / 1000;
  return now >= payload.exp - skewSeconds;
}
