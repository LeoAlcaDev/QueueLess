import type { Rol } from '@/api/types';
import type { IconName } from '@/components/ui';

// Metadatos de cada rol para las pantallas de cuenta: ícono y textos cortos. Las
// etiquetas cortas viven en ROLE_LABELS (auth/roles); acá guardamos lo que el
// diseño muestra en las tarjetas de selección y de alta de rol.
export interface RoleMeta {
  icon: IconName;
  titulo: string;
  subtitulo: string;
  // descripción para invitar a activar el rol cuando el usuario aún no lo tiene
  invitacion: string;
}

export const ROLE_META: Record<Rol, RoleMeta> = {
  CLIENTE: {
    icon: 'shoppingBag',
    titulo: 'Pedir comida',
    subtitulo: 'Explora y pre-ordena en el campus',
    invitacion: 'Explora y pre-ordena en el campus',
  },
  COMERCIO: {
    icon: 'store',
    titulo: 'Vender (comercio)',
    subtitulo: 'Gestiona pedidos desde tu local',
    invitacion: 'Vende desde tu local en el campus',
  },
  REPARTIDOR: {
    icon: 'bike',
    titulo: 'Hacer entregas',
    subtitulo: 'Lleva pedidos y gana QueuePoints',
    invitacion: 'Haz entregas y gana QueuePoints',
  },
};
