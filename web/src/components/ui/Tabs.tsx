import { cn } from '@/lib/cn';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  full?: boolean;
  className?: string;
}

export function Tabs({ tabs, active, onChange, full, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-line', full ? 'gap-0' : 'gap-1', className)}>
      {tabs.map((t) => {
        const selected = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              '-mb-px border-b-2 px-3.5 py-3 text-small font-semibold transition-colors',
              full && 'flex-1',
              selected
                ? 'border-brand text-brand-text'
                : 'border-transparent text-ink-muted hover:text-ink-soft',
            )}
          >
            {t.label}
            {t.count != null && <span className="ml-1.5 text-badge tabular-nums opacity-85">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
