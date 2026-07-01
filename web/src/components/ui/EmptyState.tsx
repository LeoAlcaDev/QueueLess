import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  // call-to-action: tipicamente un Button que invita a la primera accion
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon = 'package', title, description, action, compact, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'px-6 py-8' : 'px-6 py-12',
        className,
      )}
    >
      <span
        className="grid place-items-center rounded-pill bg-surface-muted text-ink-muted"
        style={{ width: 72, height: 72 }}
      >
        <Icon name={icon} size={32} strokeWidth={1.5} />
      </span>
      <div className="text-h3 font-semibold text-ink">{title}</div>
      {description && <p className="max-w-xs text-small text-ink-soft">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
