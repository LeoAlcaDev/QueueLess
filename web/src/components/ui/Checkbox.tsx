import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  sub?: string;
  className?: string;
}

export function Checkbox({ checked, onChange, label, sub, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('flex items-start gap-2.5 text-left', className)}
    >
      <span
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-white transition',
          checked ? 'border-brand-strong bg-brand-strong' : 'border-line-strong bg-surface',
        )}
      >
        {checked && <Icon name="check" size={13} strokeWidth={3} />}
      </span>
      {label && (
        <span>
          <span className="text-small font-medium text-ink">{label}</span>
          {sub && <span className="block text-[12.5px] text-ink-soft">{sub}</span>}
        </span>
      )}
    </button>
  );
}
