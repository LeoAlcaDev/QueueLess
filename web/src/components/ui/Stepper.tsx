import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

// Stepper de cantidad para el carrito.
export function Stepper({ value, onChange, min = 0, max = 99, className }: StepperProps) {
  const button =
    'grid h-8 w-8 place-items-center rounded-pill border border-line bg-surface text-ink disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className={button}
        aria-label="Quitar uno"
      >
        <Icon name="minus" size={14} />
      </button>
      <span className="min-w-5 text-center text-[15px] font-bold tabular-nums text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className={button}
        aria-label="Agregar uno"
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}
