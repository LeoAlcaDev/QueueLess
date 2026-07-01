// Rutas del front (las del navegador), centralizadas. Distinto de api/endpoints.ts, que
// son las del backend. Las pantallas y la navegacion enlazan siempre desde aca.
import type { Rol } from '@/types/enums';

type Id = number | string;

export const paths = {
  landing: '/',
  login: '/login',
  register: '/register',
  cuenta: '/cuenta',
  cuentaReclamos: '/cuenta/reclamos',
  explorar: '/explorar',
  explorarLocal: (id: Id) => `/explorar/locales/${id}`,

  // panel inicial segun el rol activo
  home(role: Rol): string {
    if (role === 'COMERCIO') return '/comercio';
    if (role === 'REPARTIDOR') return '/repartidor';
    return '/cliente';
  },

  cliente: {
    home: '/cliente',
    local: (id: Id) => `/cliente/locales/${id}`,
    producto: (localId: Id, productoId: Id) => `/cliente/locales/${localId}/productos/${productoId}`,
    carrito: '/cliente/carrito',
    pago: (pedidoId: Id) => `/cliente/pedidos/${pedidoId}/pago`,
    pedidos: '/cliente/pedidos',
    pedido: (id: Id) => `/cliente/pedidos/${id}`,
    seguimiento: (id: Id) => `/cliente/pedidos/${id}/seguimiento`,
    qr: (id: Id) => `/cliente/pedidos/${id}/qr`,
    resena: (id: Id) => `/cliente/pedidos/${id}/resena`,
    queuepoints: '/cliente/queuepoints',
    asistente: '/cliente/asistente',
    perfil: '/cliente/perfil',
  },

  comercio: {
    home: '/comercio',
    cola: '/comercio',
    pedido: (id: Id) => `/comercio/pedidos/${id}`,
    locales: '/comercio/locales',
    localNuevo: '/comercio/locales/nuevo',
    localEdit: (id: Id) => `/comercio/locales/${id}/editar`,
    productos: '/comercio/productos',
    productoNuevo: '/comercio/productos/nuevo',
    productoEdit: (id: Id) => `/comercio/productos/${id}/editar`,
    ocupacion: '/comercio/ocupacion',
    reclamos: '/comercio/reclamos',
    perfil: '/comercio/perfil',
  },

  repartidor: {
    home: '/repartidor',
    solicitudes: '/repartidor',
    activa: '/repartidor/activa',
    entregas: '/repartidor/entregas',
    queuepoints: '/repartidor/queuepoints',
    perfil: '/repartidor/perfil',
  },
};
