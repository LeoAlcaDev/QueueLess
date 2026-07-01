// Formatea un monto en soles, siempre con dos decimales (los precios del backend vienen
// en soles). Lo usamos en precios, totales y resumenes del carrito.
export function formatSoles(amount: number): string {
  return `S/ ${amount.toFixed(2)}`;
}

// Numero entero con separador de miles, para saldos y conteos.
export function formatInt(value: number): string {
  return value.toLocaleString('es-PE');
}
