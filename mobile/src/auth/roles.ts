import type { Rol } from '@/api/types';

export const ROLES: Rol[] = ['CLIENTE', 'COMERCIO', 'REPARTIDOR'];

export const ROLE_LABELS: Record<Rol, string> = {
  CLIENTE: 'Cliente',
  COMERCIO: 'Comercio',
  REPARTIDOR: 'Repartidor',
};

export function hasRole(roles: Rol[], rol: Rol): boolean {
  return roles.includes(rol);
}

// con un solo rol lo activamos automáticamente; con varios, el usuario elige
export function defaultRole(roles: Rol[]): Rol | null {
  return roles.length === 1 ? roles[0] : null;
}
