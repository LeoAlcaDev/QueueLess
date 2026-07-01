// Helpers propios del panel de comercio. El formato global de soles vive en lib/format;
// aca van las fechas y los resumenes de pedido.
import type { ItemPedidoResponse, MotivoCancelacion } from '@/types';

// Fecha y hora cortas en formato local, para marcas de tiempo del backend (ISO).
export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Recorta un LocalTime "HH:mm:ss" a "HH:mm" para mostrarlo o cargarlo en un input time.
export function formatHora(hora: string | null | undefined): string {
  if (!hora) return '—';
  return hora.slice(0, 5);
}

// Minutos transcurridos desde una marca de tiempo: sirve para saber cuanto lleva esperando
// un pedido en la cola y darle urgencia visual.
export function minutosDesde(iso: string | null | undefined): number {
  if (!iso) return 0;
  const inicio = new Date(iso).getTime();
  if (Number.isNaN(inicio)) return 0;
  const diff = Date.now() - inicio;
  return Math.max(0, Math.round(diff / 60000));
}

// Resumen corto de los items de un pedido: "2× Lomo saltado, 1× Inca Kola".
export function resumenItems(items: ItemPedidoResponse[]): string {
  if (items.length === 0) return 'Sin items';
  const partes: string[] = [];
  for (const item of items) {
    partes.push(`${item.cantidad}× ${item.nombre}`);
  }
  return partes.join(', ');
}

// Motivos de cancelacion que tienen sentido del lado del comercio (los COMERCIO_NO_* son
// causales que usa el cliente, no el local).
export const MOTIVOS_COMERCIO: MotivoCancelacion[] = [
  'PRODUCTO_AGOTADO',
  'FALTA_INGREDIENTE',
  'FUERA_DE_HORARIO_PRODUCTO',
  'LOCAL_SATURADO',
  'LOCAL_POR_CERRAR',
  'PROBLEMA_OPERATIVO',
  'OTRO',
];
