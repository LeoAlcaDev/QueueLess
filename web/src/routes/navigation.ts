// Items del sidebar por rol. Las rutas salen de paths.ts, asi la navegacion y las
// pantallas apuntan a lo mismo. El end marca las rutas indice (para no quedar activas en
// las sub-rutas).
import type { IconName } from '@/components/ui';
import type { Rol } from '@/types/enums';
import { paths } from './paths';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

// El perfil y los reclamos personales se gestionan desde Mi cuenta (el pie del sidebar), no
// desde la nav del rol. En comercio dejamos "Reclamos recibidos" porque es operativo (la
// bandeja del local), distinto del libro de reclamaciones personal.
export const NAV_BY_ROLE: Record<Rol, NavItem[]> = {
  CLIENTE: [
    { to: paths.cliente.home, label: 'Explorar', icon: 'store', end: true },
    { to: paths.cliente.pedidos, label: 'Mis pedidos', icon: 'receipt' },
    { to: paths.cliente.asistente, label: 'Asistente', icon: 'sparkles' },
    { to: paths.cliente.queuepoints, label: 'QueuePoints', icon: 'bolt' },
  ],
  COMERCIO: [
    { to: paths.comercio.cola, label: 'Cola de pedidos', icon: 'layoutGrid', end: true },
    { to: paths.comercio.locales, label: 'Locales', icon: 'store' },
    { to: paths.comercio.productos, label: 'Productos', icon: 'bag' },
    { to: paths.comercio.ocupacion, label: 'Ocupación', icon: 'chart' },
    { to: paths.comercio.reclamos, label: 'Reclamos recibidos', icon: 'messageCircle' },
  ],
  REPARTIDOR: [
    { to: paths.repartidor.solicitudes, label: 'Solicitudes', icon: 'bike', end: true },
    { to: paths.repartidor.entregas, label: 'Mis entregas', icon: 'package' },
    { to: paths.repartidor.queuepoints, label: 'QueuePoints', icon: 'bolt' },
  ],
};
