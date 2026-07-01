import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Pad = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: Pad;
  selected?: boolean;
  hover?: boolean;
  children: ReactNode;
}

const PAD: Record<Pad, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ pad = 'md', selected, hover, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border bg-surface transition-shadow',
        selected ? 'border-brand' : 'border-line',
        hover && 'hover:shadow-md',
        PAD[pad],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
