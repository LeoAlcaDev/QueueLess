// Punto único de acceso a la API. Namespaces por feature para evitar choques de
// nombres (p. ej. getPedido existe en cliente y en comercio).
export { api, http, API_URL } from "./client";

export * as authApi from "./auth";
export * as usuariosApi from "./usuarios";
export * as perfilesApi from "./perfiles";
export * as catalogoApi from "./catalogo";
export * as pedidosClienteApi from "./pedidosCliente";
export * as pagosApi from "./pagos";
export * as pedidosComercioApi from "./pedidosComercio";
export * as localesApi from "./locales";
export * as productosApi from "./productos";
export * as repartidorApi from "./repartidor";
export * as queuepointsApi from "./queuepoints";
export * as resenasApi from "./resenas";
export * as reclamosApi from "./reclamos";
export * as tycApi from "./tyc";
export * as asistenteApi from "./asistente";
export * as ocupacionApi from "./ocupacion";
