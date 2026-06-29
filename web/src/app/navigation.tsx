// Configuración de navegación de la AppShell. El "rol activo" es estado de UI
// derivado de la ruta: el área la decide el primer segmento del pathname
// (/cliente, /comercio, /repartidor) — el backend permite varios roles a la vez.
import {
  ClipboardList,
  Coins,
  Home,
  type LucideIcon,
  PackageSearch,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import type { Rol } from "@/types";

export type AreaKey = "cliente" | "comercio" | "repartidor";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Coincidencia exacta (para la home del área, que es prefijo del resto). */
  end?: boolean;
}

export interface AreaNav {
  key: AreaKey;
  rol: Rol;
  /** Etiqueta corta del área para el role switcher. */
  label: string;
  basePath: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Una entrada por rol. Las sub-rutas que aún no existen (Etapas 3–5) caen en el
// Placeholder genérico, así el nav ya es navegable y verificable.
export const AREAS: Record<AreaKey, AreaNav> = {
  cliente: {
    key: "cliente",
    rol: "CLIENTE",
    label: "Cliente",
    basePath: "/cliente",
    icon: ShoppingBag,
    items: [
      { to: "/cliente", label: "Inicio", icon: Home, end: true },
      { to: "/cliente/pedidos", label: "Pedidos", icon: Receipt },
      { to: "/cliente/carrito", label: "Carrito", icon: ShoppingCart },
      { to: "/cliente/points", label: "Points", icon: Coins },
    ],
  },
  comercio: {
    key: "comercio",
    rol: "COMERCIO",
    label: "Comercio",
    basePath: "/comercio",
    icon: Store,
    items: [
      { to: "/comercio", label: "Cola", icon: ClipboardList, end: true },
      { to: "/comercio/locales", label: "Locales", icon: Store },
      { to: "/comercio/productos", label: "Productos", icon: UtensilsCrossed },
      { to: "/comercio/reclamos", label: "Reclamos", icon: Receipt },
    ],
  },
  repartidor: {
    key: "repartidor",
    rol: "REPARTIDOR",
    label: "Repartidor",
    basePath: "/repartidor",
    icon: Truck,
    items: [
      {
        to: "/repartidor",
        label: "Disponibles",
        icon: PackageSearch,
        end: true,
      },
      { to: "/repartidor/entregas", label: "Entregas", icon: Truck },
      { to: "/repartidor/points", label: "Points", icon: Coins },
    ],
  },
};

// Orden de preferencia para elegir el área por defecto al entrar (cliente primero).
const AREA_ORDER: AreaKey[] = ["cliente", "comercio", "repartidor"];

const ROLE_TO_AREA: Record<Rol, AreaKey> = {
  CLIENTE: "cliente",
  COMERCIO: "comercio",
  REPARTIDOR: "repartidor",
};

/** Áreas que el usuario puede ver según sus roles activados (en orden estable). */
export function areasForRoles(roles: Rol[]): AreaNav[] {
  return AREA_ORDER.filter((key) => roles.includes(AREAS[key].rol)).map(
    (key) => AREAS[key],
  );
}

/**
 * Ruta home por defecto tras login. Primer rol con área (cliente > comercio >
 * repartidor); si no tiene ninguno, a la cuenta (desde ahí puede activar un rol).
 */
export function defaultAreaPath(roles: Rol[]): string {
  const area = areasForRoles(roles)[0];
  return area ? area.basePath : "/cuenta";
}

/**
 * Área activa según la ruta. En /cuenta (área compartida sin rol) se usa el área
 * por defecto del usuario para mantener un nav coherente; null si no hay ninguna.
 */
export function activeArea(pathname: string, roles: Rol[]): AreaNav | null {
  const segment = pathname.split("/")[1] as AreaKey | undefined;
  if (segment && AREAS[segment] && roles.includes(AREAS[segment].rol)) {
    return AREAS[segment];
  }
  return areasForRoles(roles)[0] ?? null;
}

export { ROLE_TO_AREA };
