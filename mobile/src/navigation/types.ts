// Rutas del stack raíz. Las pantallas de cuenta (perfil, tyc, reclamos, ajustes)
// viven acá arriba para alcanzarlas desde cualquier rol por nombre. Los param
// lists internos de cada rol viven en su propia feature.
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  RoleSelect: undefined;
  Tyc: undefined;
  PerfilCliente: undefined;
  PerfilComercio: undefined;
  PerfilRepartidor: undefined;
  Reclamos: undefined;
  Settings: undefined;
};
