import { useState } from 'react';
import { cn } from '@/lib/cn';

interface StarsProps {
  value?: number;
  size?: number;
  // si viene onChange, las estrellas se vuelven seleccionables (para dejar una resena)
  onChange?: (value: number) => void;
  className?: string;
}

export function Stars({ value = 0, size = 16, onChange, className }: StarsProps) {
  const [hover, setHover] = useState(0);
  const interactive = Boolean(onChange);

  return (
    <span className={cn('inline-flex gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = (hover || value) >= i;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHover(i)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => onChange?.(i)}
            className={cn('leading-none', interactive ? 'cursor-pointer' : 'cursor-default')}
            style={{ color: filled ? '#F59E0B' : 'var(--color-border-strong)' }}
            aria-label={`${i} de 5`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </span>
  );
}
