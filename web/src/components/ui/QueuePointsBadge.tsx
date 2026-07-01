import { cn } from '@/lib/cn';
import { formatInt } from '@/lib/format';
import { Icon } from './Icon';

interface QueuePointsBadgeProps {
  points: number;
  variant?: 'pill' | 'text';
  className?: string;
}

// QueuePoints en morado en ambas variantes: la pildora compacta para listas y la version
// con texto para el saldo.
export function QueuePointsBadge({ points, variant = 'pill', className }: QueuePointsBadgeProps) {
  if (variant === 'text') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 font-bold text-points-strong', className)}>
        <Icon name="bolt" size={18} className="text-points" />
        <span className="tabular-nums">{formatInt(points)}</span>
        <span className="font-semibold">QueuePoints</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill bg-points-soft px-2.5 py-1 text-badge font-semibold tabular-nums text-points-strong',
        className,
      )}
    >
      <Icon name="bolt" size={12} />
      {formatInt(points)}
    </span>
  );
}
