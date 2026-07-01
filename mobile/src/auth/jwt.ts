import type { JwtClaims, Rol } from '@/api/types';

// Decodifica el payload del JWT sin verificar la firma (de eso se encarga el
// backend); solo nos importan exp y roles para decidir el refresh y el gating.

// base64url a texto: Hermes trae atob global, pero dejamos un respaldo manual por
// si corre en un runtime que no lo expone.
function base64UrlToString(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  if (typeof atob === 'function') return atob(base64);
  return manualAtob(base64);
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function manualAtob(input: string): string {
  const str = input.replace(/=+$/, '');
  let output = '';
  let bc = 0;
  let bs = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = ALPHABET.indexOf(str.charAt(i));
    if (idx === -1) continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
  }
  return output;
}

export function decodeJwt(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlToString(parts[1])) as JwtClaims;
  } catch {
    return null;
  }
}

// vencido si ya pasó su exp; el colchón evita mandar un token a punto de morir
export function isExpired(token: string, skewSeconds = 10): boolean {
  const claims = decodeJwt(token);
  if (!claims?.exp) return true;
  return Date.now() / 1000 >= claims.exp - skewSeconds;
}

export function rolesFromToken(token: string): Rol[] {
  return decodeJwt(token)?.roles ?? [];
}
