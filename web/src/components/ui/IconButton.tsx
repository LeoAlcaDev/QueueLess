import { type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

type Variant = 'ghost' | 'surface' | 'soft';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: Variant;
  size?: number;
  active?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  ghost: 'border-transparent bg-transparent text-ink-soft hover:bg-surface-muted',
  surface: 'border-line bg-surface text-ink-soft hover:bg-surface-muted',
  soft: 'border-transparent bg-brand-soft text-brand-text',
};

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 38,
  active,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'grid shrink-0 place-items-center rounded-button border transition-colors',
        active ? 'border-brand bg-brand-soft text-brand-text' : VARIANTS[variant],
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </button>
  );
}
