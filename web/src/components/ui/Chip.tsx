import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info' | 'points';

interface ChipProps {
  children: ReactNode;
  tone?: Tone;
  icon?: IconName;
  size?: 'sm' | 'md';
  className?: string;
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-soft',
  brand: 'bg-brand-soft text-brand-text',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  error: 'bg-error-bg text-error-fg',
  info: 'bg-info-bg text-info-fg',
  points: 'bg-points-soft text-points-strong',
};

export function Chip({ children, tone = 'neutral', icon, size = 'md', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill font-semibold leading-none',
        TONES[tone],
        size === 'sm' ? 'px-2 py-1 text-[11.5px]' : 'px-2.5 py-1.5 text-[12.5px]',
        className,
      )}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 11 : 13} />}
      {children}
    </span>
  );
}
