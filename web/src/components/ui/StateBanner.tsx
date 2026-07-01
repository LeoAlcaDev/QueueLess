import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

type Tone = 'info' | 'success' | 'warning' | 'error' | 'points';

interface StateBannerProps {
  tone?: Tone;
  title?: string;
  icon?: IconName;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const TONES: Record<Tone, { box: string; icon: IconName }> = {
  info: { box: 'bg-info-bg text-info-fg', icon: 'info' },
  success: { box: 'bg-success-bg text-success-fg', icon: 'checkCircle' },
  warning: { box: 'bg-warning-bg text-warning-fg', icon: 'alertTriangle' },
  error: { box: 'bg-error-bg text-error-fg', icon: 'alertCircle' },
  points: { box: 'bg-points-soft text-points-strong', icon: 'bolt' },
};

// Aviso en linea dentro del contenido (no es un toast): explica un estado o una regla.
export function StateBanner({ tone = 'info', title, icon, children, action, className }: StateBannerProps) {
  const t = TONES[tone];
  return (
    <div className={cn('flex gap-2.5 rounded-input p-3.5', t.box, className)}>
      <Icon name={icon ?? t.icon} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="text-[13.5px] font-bold">{title}</div>}
        {children && <div className="text-small leading-snug opacity-95">{children}</div>}
      </div>
      {action}
    </div>
  );
}
