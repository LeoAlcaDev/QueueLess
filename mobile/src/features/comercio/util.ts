import { api, endpoints } from '@/api';

// Opciones de hora para los selectores de horario del comercio (apertura, cierre,
// ventanas de servicio). Medias horas de 06:00 a 22:00, que cubre el día operativo
// del campus. El backend recibe LocalTime en formato HH:mm.
export const TIME_OPTIONS: { label: string; value: string }[] = (() => {
  const opciones: { label: string; value: string }[] = [];
  for (let hora = 6; hora <= 22; hora += 1) {
    for (const minuto of [0, 30]) {
      const hh = String(hora).padStart(2, '0');
      const mm = String(minuto).padStart(2, '0');
      const valor = `${hh}:${mm}`;
      opciones.push({ label: valor, value: valor });
    }
  }
  return opciones;
})();

// recorta un LocalTime del backend (puede venir como HH:mm:ss) a HH:mm para casar
// con los valores del selector
export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

// asegura que el valor guardado esté entre las opciones del selector; si no, lo
// agrega al inicio para no perderlo al editar
export function timeOptionsWith(value: string | null): { label: string; value: string }[] {
  if (!value) return TIME_OPTIONS;
  const existe = TIME_OPTIONS.some((o) => o.value === value);
  if (existe) return TIME_OPTIONS;
  return [{ label: value, value }, ...TIME_OPTIONS];
}

// sube la foto del producto como multipart. El objeto de archivo de React Native no
// calza con el tipo Blob del DOM, así que lo pasamos con un cast acotado.
export async function uploadProductoFoto(
  productoId: number,
  asset: { uri: string; name: string; mimeType: string },
): Promise<void> {
  const form = new FormData();
  form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType } as unknown as Blob);
  await api.post(endpoints.comercio.productoFoto(productoId), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// resumen corto de los items de un pedido para mostrarlo en una línea
export function resumenItems(items: { nombre: string; cantidad: number }[]): string {
  return items.map((item) => `${item.cantidad}× ${item.nombre}`).join(' · ');
}

// minutos transcurridos desde una fecha ISO; sirve para marcar pedidos que llevan
// mucho rato esperando
export function minutosDesde(iso: string | null | undefined): number {
  if (!iso) return 0;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - fecha.getTime()) / 60000));
}
