import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  // el Btn del diseno (boton con icono) es solo el Button con estas props, no otro componente
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-strong text-on-brand hover:bg-brand-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-muted',
  destructive: 'bg-error-dot text-white hover:opacity-90',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-muted',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3 text-small',
  md: 'h-11 gap-2 px-4 text-[15px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  loading,
  icon,
  iconRight,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 16 : 18;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-button font-semibold',
        // easing del sistema + scale al presionar, sin rebotes
        'transition duration-150 ease-quart active:scale-[0.98]',
        'focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={iconSize - 1} /> : icon && <Icon name={icon} size={iconSize} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
