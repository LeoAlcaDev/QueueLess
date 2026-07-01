import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui';

interface FoodThumbProps {
  src?: string | null;
  alt?: string;
  size?: number;
  icon?: IconName;
  className?: string;
}

// Miniatura de comida. Si hay foto la muestra recortada; si no, un placeholder con un icono
// sobre superficie tenue. La foto vive siempre dentro de una tarjeta, nunca como fondo.
export function FoodThumb({ src, alt = '', size = 56, icon = 'utensils', className }: FoodThumbProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('shrink-0 rounded-input object-cover', className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-input bg-surface-muted text-ink-muted', className)}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.42)} strokeWidth={1.5} />
    </span>
  );
}
