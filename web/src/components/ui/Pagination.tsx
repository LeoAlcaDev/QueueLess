import { Fragment } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface PaginationProps {
  // page es 1-indexed para la UI (usePagination ya entrega el 0-indexed para el backend)
  page: number;
  size: number;
  total: number;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
  sizeOptions?: number[];
  className?: string;
}

// arma la ventana de numeros a mostrar: primera, ultima, y los vecinos de la actual
function pageWindow(page: number, totalPages: number): number[] {
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - 1; p <= page + 1; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  return [...pages].sort((a, b) => a - b);
}

export function Pagination({
  page,
  size,
  total,
  onPage,
  onSize,
  sizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const windowPages = pageWindow(page, totalPages);

  const navButton =
    'inline-grid h-9 min-w-9 place-items-center rounded-md border border-line bg-surface px-2 text-ink-soft disabled:cursor-not-allowed disabled:opacity-45';

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <span className="text-small tabular-nums text-ink-muted">
        Mostrando {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        {onSize && (
          <select
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            aria-label="Resultados por página"
            className="mr-1 h-9 rounded-md border border-line bg-surface px-2 text-small text-ink-soft outline-none"
          >
            {sizeOptions.map((s) => (
              <option key={s} value={s}>
                {s} / pág.
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={navButton}
          aria-label="Página anterior"
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        {windowPages.map((p, i) => {
          const previous = windowPages[i - 1];
          const gap = previous != null && p - previous > 1;
          const current = p === page;
          return (
            <Fragment key={p}>
              {gap && <span className="px-1 text-small text-ink-muted">…</span>}
              <button
                type="button"
                onClick={() => onPage(p)}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'inline-grid h-9 min-w-9 place-items-center rounded-md border px-2 text-small font-semibold tabular-nums',
                  current
                    ? 'border-brand bg-brand-soft text-brand-text'
                    : 'border-line bg-surface text-ink-soft',
                )}
              >
                {p}
              </button>
            </Fragment>
          );
        })}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className={navButton}
          aria-label="Página siguiente"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
