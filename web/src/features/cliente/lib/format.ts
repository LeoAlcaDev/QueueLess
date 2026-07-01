// Formateo de fechas para el area de cliente. Las fechas del backend llegan como ISO; aca
// las mostramos en formato local peruano. El dinero ya tiene su helper en @/lib/format.

export function formatFechaHora(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
