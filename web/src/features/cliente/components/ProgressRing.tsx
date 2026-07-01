import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/ui';

type RingTone = 'brand' | 'info' | 'points' | 'warning' | 'success' | 'error';

const TONE_TEXT: Record<RingTone, string> = {
  brand: 'text-brand',
  info: 'text-info-fg',
  points: 'text-points',
  warning: 'text-warning-fg',
  success: 'text-success-fg',
  error: 'text-error-fg',
};

interface ProgressRingProps {
  tone?: RingTone;
  icon: IconName;
  // cuando es true un arco gira de forma lineal (busqueda de repartidor / espera), sin easing
  spinning?: boolean;
  size?: number;
}

// Anillo de estado con un icono al centro. En los estados de espera un arco gira de forma
// lineal, como pide el diseno para la busqueda de repartidor.
export function ProgressRing({ tone = 'brand', icon, spinning, size = 132 }: ProgressRingProps) {
  return (
    <div
      className={cn('relative grid place-items-center', TONE_TEXT[tone])}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6" className="opacity-20" />
        {spinning && (
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="70 210"
            className="origin-center animate-spin [animation-duration:1.6s]"
          />
        )}
      </svg>
      <Icon name={icon} size={Math.round(size * 0.3)} strokeWidth={1.5} />
    </div>
  );
}
