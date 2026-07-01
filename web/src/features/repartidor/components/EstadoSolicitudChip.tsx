import { cn } from '@/lib/cn';
import { ESTADO_SOLICITUD_LABELS, type EstadoSolicitudDelivery } from '@/types';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info';

const TONES: Record<EstadoSolicitudDelivery, Tone> = {
  BUSCANDO: 'info',
  ASIGNADO: 'brand',
  RECOGIDO: 'warning',
  ENTREGADO: 'success',
  SIN_REPARTIDOR: 'neutral',
  CANCELADO: 'error',
};

const BOX: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-soft',
  brand: 'bg-brand-soft text-brand-text',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  error: 'bg-error-bg text-error-fg',
  info: 'bg-info-bg text-info-fg',
};

const DOT: Record<Tone, string> = {
  neutral: 'bg-ink-muted',
  brand: 'bg-brand',
  success: 'bg-success-dot',
  warning: 'bg-warning-dot',
  error: 'bg-error-dot',
  info: 'bg-info-dot',
};

// Pildora del estado de una solicitud de delivery. Lleva un punto del color del estado
// ademas del texto, para no depender solo del color. Mismo look en lista, entrega activa
// e historial.
export function EstadoSolicitudChip({ estado }: { estado: EstadoSolicitudDelivery }) {
  const tone = TONES[estado];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 text-badge font-semibold',
        BOX[tone],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[tone])} />
      {ESTADO_SOLICITUD_LABELS[estado]}
    </span>
  );
}
