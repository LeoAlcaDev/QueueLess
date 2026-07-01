import { cn } from '@/lib/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  sub?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, label, sub, disabled, className }: ToggleProps) {
  const swatch = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-pill transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-strong' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  );

  if (!label) return swatch;
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="text-small font-semibold text-ink">{label}</div>
        {sub && <div className="text-[12.5px] text-ink-soft">{sub}</div>}
      </div>
      {swatch}
    </div>
  );
}
