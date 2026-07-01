// Rutas del backend, centralizadas y tomadas de los controllers reales. La baseURL ya
// trae el prefijo /api, asi que aca va lo que sigue. Las rutas con :id son funciones.
// Las pantallas nunca arman strings de rutas a mano: salen siempre de aca.

export const AUTH_ENDPOINTS = {
  register: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
};

type Id = number | string;

export const endpoints = {
  auth: AUTH_ENDPOINTS,

  usuarios: {
    me: '/v1/usuarios/me',
    activarRol: '/v1/usuarios/me/activar-rol',
  },

  perfiles: {
    base: '/v1/me/perfiles',
    cliente: '/v1/me/perfiles/cliente',
    comercio: '/v1/me/perfiles/comercio',
    repartidor: '/v1/me/perfiles/repartidor',
  },

  queuepoints: {
    saldo: '/v1/me/queuepoints/saldo',
    movimientos: '/v1/me/queuepoints/movimientos',
    canjear: '/v1/me/queuepoints/canjear',
  },

  tyc: {
    estado: '/v1/me/tyc',
    aceptar: '/v1/me/tyc/aceptacion',
  },

  // catalogo publico
  puntosDeVenta: {
    list: '/v1/puntos-de-venta',
    detail: (id: Id) => `/v1/puntos-de-venta/${id}`,
    productos: (id: Id) => `/v1/puntos-de-venta/${id}/productos`,
    resenas: (id: Id) => `/v1/puntos-de-venta/${id}/resenas`,
    tiempoEstimado: (id: Id) => `/v1/puntos-de-venta/${id}/tiempo-estimado`,
  },
  repartidores: {
    resenas: (id: Id) => `/v1/repartidores/${id}/resenas`,
  },

  cliente: {
    pedidos: {
      base: '/v1/cliente/pedidos',
      detail: (id: Id) => `/v1/cliente/pedidos/${id}`,
      qr: (id: Id) => `/v1/cliente/pedidos/${id}/qr`,
      cancelar: (id: Id) => `/v1/cliente/pedidos/${id}/cancelar`,
      reintentarDelivery: (id: Id) => `/v1/cliente/pedidos/${id}/solicitud-delivery/reintentar`,
      cambiarAPickup: (id: Id) => `/v1/cliente/pedidos/${id}/cambiar-a-pickup`,
      stream: '/v1/cliente/pedidos/stream',
      resenas: (pedidoId: Id) => `/v1/cliente/pedidos/${pedidoId}/resenas`,
    },
    pagos: {
      iniciar: '/v1/cliente/pagos/iniciar',
      detail: (id: Id) => `/v1/cliente/pagos/${id}`,
    },
    ocupacion: (puntoVentaId: Id) => `/v1/cliente/ocupacion/${puntoVentaId}`,
    asistente: '/v1/cliente/asistente',
  },

  comercio: {
    pedidos: {
      cola: '/v1/comercio/pedidos/cola',
      detail: (id: Id) => `/v1/comercio/pedidos/${id}`,
      aceptar: (id: Id) => `/v1/comercio/pedidos/${id}/aceptar`,
      iniciarPreparacion: (id: Id) => `/v1/comercio/pedidos/${id}/iniciar-preparacion`,
      marcarListo: (id: Id) => `/v1/comercio/pedidos/${id}/marcar-listo`,
      marcarEntregado: (id: Id) => `/v1/comercio/pedidos/${id}/marcar-entregado`,
      rechazar: (id: Id) => `/v1/comercio/pedidos/${id}/rechazar`,
      cancelar: (id: Id) => `/v1/comercio/pedidos/${id}/cancelar`,
      stream: '/v1/comercio/pedidos/stream',
    },
    puntosDeVenta: {
      base: '/v1/comercio/puntos-de-venta',
      detail: (id: Id) => `/v1/comercio/puntos-de-venta/${id}`,
      estado: (id: Id) => `/v1/comercio/puntos-de-venta/${id}/estado`,
    },
    productos: {
      base: '/v1/comercio/productos',
      detail: (id: Id) => `/v1/comercio/productos/${id}`,
      disponibilidad: (id: Id) => `/v1/comercio/productos/${id}/disponibilidad`,
      foto: (id: Id) => `/v1/comercio/productos/${id}/foto`,
    },
    ocupacion: (puntoVentaId: Id) => `/v1/comercio/ocupacion/${puntoVentaId}`,
    reclamos: {
      list: '/v1/comercio/reclamos',
      responder: (id: Id) => `/v1/comercio/reclamos/${id}/responder`,
    },
  },

  repartidor: {
    pedidosDisponibles: '/v1/repartidor/pedidos-disponibles',
    misEntregas: '/v1/repartidor/mis-entregas',
    solicitud: (id: Id) => `/v1/repartidor/solicitudes/${id}`,
    aceptar: (id: Id) => `/v1/repartidor/solicitudes/${id}/aceptar`,
    confirmarRecogida: (id: Id) => `/v1/repartidor/solicitudes/${id}/confirmar-recogida`,
    confirmarEntrega: (id: Id) => `/v1/repartidor/solicitudes/${id}/confirmar-entrega`,
  },

  // libro de reclamaciones, cualquier autenticado
  reclamos: {
    create: '/v1/reclamos',
    mios: '/v1/reclamos/mios',
  },
};
