import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface Option {
  value: string;
  label: string;
}

interface ChipMultiSelectProps {
  options: Array<Option | string>;
  value: string[];
  onChange: (value: string[]) => void;
  columns?: number;
  className?: string;
}

// Seleccion multiple en forma de chips (alergenos a evitar, dietas). Marca con check los
// activos y alterna al tocar.
export function ChipMultiSelect({ options, value, onChange, columns, className }: ChipMultiSelectProps) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div
      className={cn(columns ? 'grid gap-2' : 'flex flex-wrap gap-2', className)}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-pill border px-3 py-2 text-small font-semibold transition',
              selected ? 'border-brand bg-brand-soft text-brand-text' : 'border-line bg-surface text-ink-soft',
            )}
          >
            {selected && <Icon name="check" size={13} strokeWidth={3} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
