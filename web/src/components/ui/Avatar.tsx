import { cn } from '@/lib/cn';

type Tone = 'brand' | 'points';

interface AvatarProps {
  initials: string;
  size?: number;
  tone?: Tone;
  className?: string;
}

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-text',
  points: 'bg-points-soft text-points-strong',
};

export function Avatar({ initials, size = 40, tone = 'brand', className }: AvatarProps) {
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center rounded-pill font-bold', TONES[tone], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}
