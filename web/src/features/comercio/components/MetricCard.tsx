import { Card, Icon, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'brand' | 'warning' | 'success';

interface MetricCardProps {
  icon: IconName;
  label: string;
  value: number | string;
  tone?: Tone;
}

// El recuadro del icono cambia de color segun el tono, para que de un vistazo se distinga lo
// urgente (por aceptar = warning) de lo resuelto (listos = success).
const CHIP: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-soft',
  brand: 'bg-brand-soft text-brand-text',
  warning: 'bg-warning-bg text-warning-fg',
  success: 'bg-success-bg text-success-fg',
};

// Tarjeta de metrica del resumen de la cola: un numero grande con su etiqueta y un icono
// con tono. Densa, pensada para leerse al instante desde el mostrador.
export function MetricCard({ icon, label, value, tone = 'neutral' }: MetricCardProps) {
  return (
    <Card pad="md" className="flex min-w-0 flex-1 items-center gap-3">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[10px]', CHIP[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <div className="text-h2 font-bold leading-none tracking-tight tabular-nums text-ink">{value}</div>
        <div className="mt-1 truncate text-[12px] text-ink-muted">{label}</div>
      </div>
    </Card>
  );
}
