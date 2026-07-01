import { cn } from '@/lib/cn';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<Option<T>>;
  full?: boolean;
  className?: string;
}

// Control segmentado de 2 o 3 opciones (por ejemplo recojo / delivery). Es un radio
// visual: una sola opcion activa a la vez.
export function Segmented<T extends string>({ value, onChange, options, full, className }: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 rounded-button border border-line bg-surface-muted p-0.5',
        full && 'w-full',
        className,
      )}
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'whitespace-nowrap rounded-[7px] px-3.5 py-2 text-[13.5px] font-semibold transition',
              full && 'flex-1',
              selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
