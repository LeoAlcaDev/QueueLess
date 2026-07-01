import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface WaitTimeBadgeProps {
  minutes: number;
  className?: string;
}

// Tiempo de espera del local: hasta 5 min verde, 5 a 15 ambar, mas de 15 rojo.
export function WaitTimeBadge({ minutes, className }: WaitTimeBadgeProps) {
  const tone =
    minutes < 5
      ? 'bg-success-bg text-success-fg'
      : minutes <= 15
        ? 'bg-warning-bg text-warning-fg'
        : 'bg-error-bg text-error-fg';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-badge font-semibold tabular-nums',
        tone,
        className,
      )}
    >
      <Icon name="clock" size={12} />
      {minutes} min
    </span>
  );
}
