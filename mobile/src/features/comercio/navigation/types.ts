// Param lists de los stacks del comercio. Cada tab monta su propio native-stack;
// los detalles y editores se empujan dentro del stack de su tab.

export type ColaStackParamList = {
  Cola: undefined;
  PedidoDetalle: { pedidoId: number };
  CerrarEntrega: { pedidoId: number };
  Escanear: { pedidoId: number };
};

export type ProductosStackParamList = {
  Productos: undefined;
  ProductoEditor: { puntoDeVentaId: number; productoId?: number };
};

export type LocalesStackParamList = {
  PuntosDeVenta: undefined;
  PdvEditor: { puntoDeVentaId?: number };
};

export type OcupacionStackParamList = {
  Ocupacion: undefined;
};

export type ComercioPerfilStackParamList = {
  ComercioPerfil: undefined;
  ReclamosComercio: undefined;
};
