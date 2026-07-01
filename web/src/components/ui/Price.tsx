import { cn } from '@/lib/cn';
import { formatSoles } from '@/lib/format';

interface PriceProps {
  amount: number;
  strong?: boolean;
  className?: string;
}

export function Price({ amount, strong = true, className }: PriceProps) {
  return (
    <span className={cn('tabular-nums text-ink', strong ? 'font-bold' : 'font-medium', className)}>
      {formatSoles(amount)}
    </span>
  );
}
