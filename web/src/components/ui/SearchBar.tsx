import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  big?: boolean;
  className?: string;
}

// Buscador controlado con boton de limpiar. El debounce lo pone quien lo usa, con
// useDebouncedValue, para no disparar el request en cada tecla.
export function SearchBar({ value, onChange, placeholder = 'Buscar', big, className }: SearchBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-input border border-line bg-surface px-3.5',
        big ? 'h-[52px]' : 'h-11',
        className,
      )}
    >
      <Icon name="search" size={18} className="shrink-0 text-ink-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar busqueda"
          className="grid place-items-center text-ink-muted hover:text-ink-soft"
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
