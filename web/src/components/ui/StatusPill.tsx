import { ORDER_STATES, type EstadoPedido, type StatusTone } from '@/types/enums';
import { cn } from '@/lib/cn';

const TONE_BOX: Record<StatusTone, string> = {
  warning: 'bg-warning-bg text-warning-fg',
  info: 'bg-info-bg text-info-fg',
  brand: 'bg-brand-soft text-brand-text',
  success: 'bg-success-bg text-success-fg',
  neutral: 'bg-surface-muted text-ink-soft',
};

const TONE_DOT: Record<StatusTone, string> = {
  warning: 'bg-warning-dot',
  info: 'bg-info-dot',
  brand: 'bg-brand',
  success: 'bg-success-dot',
  neutral: 'bg-ink-muted',
};

interface StatusPillProps {
  estado: EstadoPedido;
  className?: string;
}

// Badge del estado del pedido: la etiqueta y el tono salen del mapa ORDER_STATES, asi
// los 11 estados se ven igual en cliente y comercio.
export function StatusPill({ estado, className }: StatusPillProps) {
  const { label, tone } = ORDER_STATES[estado];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-badge font-semibold',
        TONE_BOX[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} />
      {label}
    </span>
  );
}
