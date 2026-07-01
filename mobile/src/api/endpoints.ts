// Rutas del backend, agrupadas por área y leídas de los controllers reales. La
// baseURL ya incluye /api, así que acá los paths arrancan después de /api: auth
// va sin versión, el resto bajo /v1. Las funciones reciben los path params; la
// paginación viaja como query (page, size), nunca en el path.

export type ComercioPedidoAccion =
  | 'aceptar'
  | 'iniciar-preparacion'
  | 'marcar-listo'
  | 'marcar-entregado'
  | 'rechazar'
  | 'cancelar';

export const endpoints = {
  auth: {
    register: () => '/auth/register',
    login: () => '/auth/login',
    refresh: () => '/auth/refresh',
  },
  usuarios: {
    me: () => '/v1/usuarios/me',
    activarRol: () => '/v1/usuarios/me/activar-rol',
  },
  perfiles: {
    get: () => '/v1/me/perfiles',
    cliente: () => '/v1/me/perfiles/cliente',
    comercio: () => '/v1/me/perfiles/comercio',
    repartidor: () => '/v1/me/perfiles/repartidor',
  },
  tyc: {
    get: () => '/v1/me/tyc',
    aceptar: () => '/v1/me/tyc/aceptacion',
  },
  queuepoints: {
    saldo: () => '/v1/me/queuepoints/saldo',
    movimientos: () => '/v1/me/queuepoints/movimientos',
    canjear: () => '/v1/me/queuepoints/canjear',
  },
  catalogo: {
    puntos: () => '/v1/puntos-de-venta',
    punto: (id: number) => `/v1/puntos-de-venta/${id}`,
    tiempoEstimado: (id: number) => `/v1/puntos-de-venta/${id}/tiempo-estimado`,
    productos: (id: number) => `/v1/puntos-de-venta/${id}/productos`,
    resenasPunto: (id: number) => `/v1/puntos-de-venta/${id}/resenas`,
    resenasRepartidor: (id: number) => `/v1/repartidores/${id}/resenas`,
  },
  cliente: {
    ocupacion: (puntoVentaId: number) => `/v1/cliente/ocupacion/${puntoVentaId}`,
    crearPedido: () => '/v1/cliente/pedidos',
    pedidos: () => '/v1/cliente/pedidos',
    pedido: (id: number) => `/v1/cliente/pedidos/${id}`,
    pedidoQr: (id: number) => `/v1/cliente/pedidos/${id}/qr`,
    cancelar: (id: number) => `/v1/cliente/pedidos/${id}/cancelar`,
    reintentarDelivery: (id: number) => `/v1/cliente/pedidos/${id}/solicitud-delivery/reintentar`,
    cambiarAPickup: (id: number) => `/v1/cliente/pedidos/${id}/cambiar-a-pickup`,
    crearResena: (pedidoId: number) => `/v1/cliente/pedidos/${pedidoId}/resenas`,
    iniciarPago: () => '/v1/cliente/pagos/iniciar',
    pago: (id: number) => `/v1/cliente/pagos/${id}`,
    asistente: () => '/v1/cliente/asistente',
    pedidosStream: () => '/v1/cliente/pedidos/stream',
  },
  comercio: {
    pdv: () => '/v1/comercio/puntos-de-venta',
    pdvById: (id: number) => `/v1/comercio/puntos-de-venta/${id}`,
    pdvEstado: (id: number) => `/v1/comercio/puntos-de-venta/${id}/estado`,
    productos: () => '/v1/comercio/productos',
    productoById: (id: number) => `/v1/comercio/productos/${id}`,
    productoDisponibilidad: (id: number) => `/v1/comercio/productos/${id}/disponibilidad`,
    productoFoto: (id: number) => `/v1/comercio/productos/${id}/foto`,
    ocupacion: (puntoVentaId: number) => `/v1/comercio/ocupacion/${puntoVentaId}`,
    cola: () => '/v1/comercio/pedidos/cola',
    pedido: (id: number) => `/v1/comercio/pedidos/${id}`,
    pedidoAccion: (id: number, accion: ComercioPedidoAccion) => `/v1/comercio/pedidos/${id}/${accion}`,
    reclamos: () => '/v1/comercio/reclamos',
    responderReclamo: (id: number) => `/v1/comercio/reclamos/${id}/responder`,
    pedidosStream: () => '/v1/comercio/pedidos/stream',
  },
  repartidor: {
    disponibles: () => '/v1/repartidor/pedidos-disponibles',
    misEntregas: () => '/v1/repartidor/mis-entregas',
    solicitud: (id: number) => `/v1/repartidor/solicitudes/${id}`,
    aceptar: (id: number) => `/v1/repartidor/solicitudes/${id}/aceptar`,
    confirmarRecogida: (id: number) => `/v1/repartidor/solicitudes/${id}/confirmar-recogida`,
    confirmarEntrega: (id: number) => `/v1/repartidor/solicitudes/${id}/confirmar-entrega`,
  },
  reclamos: {
    crear: () => '/v1/reclamos',
    mios: () => '/v1/reclamos/mios',
  },
  // solo en perfil dev del backend, sirve para probar el flujo de pago en local
  dev: {
    simularPago: (id: number) => `/dev/pedidos/${id}/simular-pago`,
  },
} as const;
