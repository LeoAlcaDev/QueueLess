// Rutas del navegador propias del área pública. El paths.ts de la base cubre el resto de la
// app; estas viven aquí para no armar los strings a mano en cada pantalla y mantener el módulo
// autocontenido.
type Id = number | string;

export const publicoPaths = {
  explorar: '/explorar',
  local: (id: Id) => `/explorar/locales/${id}`,
};
