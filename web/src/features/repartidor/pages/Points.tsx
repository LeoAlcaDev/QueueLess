import { endpoints, http, type PageResponse } from '@/api';
import { useApi, usePagination } from '@/hooks';
import { cn } from '@/lib/cn';
import { formatInt } from '@/lib/format';
import { usePageChrome } from '@/components/layout';
import { Button, Card, EmptyState, Icon, Pagination, Skeleton } from '@/components/ui';
import { TIPO_MOVIMIENTO_LABELS, type MovimientoResponse, type SaldoResponse } from '@/types';
import { ErrorState, formatFechaHora } from '../components';

// Saldo y movimientos de QueuePoints del repartidor. Gana 50 por cada entrega completada;
// el saldo sale de sumar los movimientos del ledger.
export default function Points() {
  usePageChrome('QueuePoints', {
    sub: 'Ganas 50 por cada entrega que completas',
    maxWidth: 620,
  });
  const { page, size, apiPage, setPage, setSize } = usePagination({ defaultSize: 10 });

  const saldo = useApi<SaldoResponse>(
    (signal) => http.get<SaldoResponse>(endpoints.queuepoints.saldo, { signal }),
    [],
  );

  const movimientos = useApi<PageResponse<MovimientoResponse>>(
    (signal) =>
      http.getPage<MovimientoResponse>(endpoints.queuepoints.movimientos, {
        params: { page: apiPage, size },
        signal,
      }),
    [apiPage, size],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* unico gradiente de la app: el hero del saldo, violeta sutil de points a points-strong */}
      <div className="rounded-card bg-gradient-to-br from-points to-points-strong p-6 text-on-brand shadow-md">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] opacity-90">
          <Icon name="bolt" size={14} />
          QueuePoints ganados
        </div>
        {saldo.loading ? (
          <Skeleton width={140} height={44} className="mt-2" />
        ) : saldo.error ? (
          <Button variant="secondary" size="sm" icon="refresh" onClick={saldo.refetch} className="mt-2">
            Reintentar
          </Button>
        ) : (
          <div className="mt-1.5 text-[46px] font-bold leading-none tabular-nums tracking-tight">
            {formatInt(saldo.data?.saldo ?? 0)}
          </div>
        )}
        <div className="mt-1.5 text-small opacity-95">Ganas 50 por cada entrega que completas</div>
      </div>

      <div>
        <h2 className="ql-section-label mb-2.5">Movimientos</h2>

        {movimientos.loading ? (
          <Card className="flex flex-col gap-3">
            <Skeleton width="80%" />
            <Skeleton width="60%" />
            <Skeleton width="70%" />
          </Card>
        ) : movimientos.error ? (
          <ErrorState error={movimientos.error} onRetry={movimientos.refetch} />
        ) : !movimientos.data || movimientos.data.content.length === 0 ? (
          <EmptyState
            icon="bolt"
            title="Todavía no tienes movimientos"
            description="Completa entregas para empezar a ganar QueuePoints."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <Card pad="none">
              {movimientos.data.content.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-pill bg-points-soft text-points-strong">
                      <Icon name="bolt" size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold text-ink">
                        {m.descripcion ?? TIPO_MOVIMIENTO_LABELS[m.tipo]}
                      </div>
                      <div className="text-[11.5px] text-ink-muted">
                        {TIPO_MOVIMIENTO_LABELS[m.tipo]} · {formatFechaHora(m.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums font-bold',
                      m.monto >= 0 ? 'text-points-strong' : 'text-error-fg',
                    )}
                  >
                    {m.monto >= 0 ? '+' : ''}
                    {formatInt(m.monto)}
                  </span>
                </div>
              ))}
            </Card>
            <Pagination
              page={page}
              size={size}
              total={movimientos.data.totalElements}
              onPage={setPage}
              onSize={setSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
