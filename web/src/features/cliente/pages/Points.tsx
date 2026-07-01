import { http, endpoints } from '@/api';
import type { PageResponse } from '@/api';
import { useApi, usePagination } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Card, EmptyState, Icon, Pagination, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatInt } from '@/lib/format';
import { TIPO_MOVIMIENTO_LABELS, type MovimientoResponse, type SaldoResponse } from '@/types';
import { ErrorState } from '../components';
import { formatFechaHora } from '../lib/format';

export default function Points() {
  usePageChrome('QueuePoints', { maxWidth: 680 });

  const saldo = useApi<SaldoResponse>((signal) => http.get(endpoints.queuepoints.saldo, { signal }), []);

  const { page, size, apiPage, setPage } = usePagination({ defaultSize: 10 });
  const movimientos = useApi<PageResponse<MovimientoResponse>>(
    (signal) => http.getPage(endpoints.queuepoints.movimientos, { params: { page: apiPage, size }, signal }),
    [apiPage, size],
  );

  const lista = movimientos.data?.content ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[620px] flex-col gap-5">
      {/* unico lugar con gradiente: el saldo de QueuePoints (violeta sutil) */}
      <div
        className="rounded-card p-6 text-on-brand shadow-md"
        style={{ background: 'linear-gradient(135deg, var(--color-points), var(--color-points-strong))' }}
      >
        <div className="flex items-center gap-1.5 text-badge font-bold uppercase tracking-wider opacity-90">
          <Icon name="bolt" size={14} />
          Mis QueuePoints
        </div>
        {saldo.loading ? (
          <Skeleton width={120} height={44} className="mt-1.5 opacity-40" />
        ) : (
          <div className="mt-1.5 text-[44px] font-bold leading-none tabular-nums">
            {formatInt(saldo.data?.saldo ?? 0)}
          </div>
        )}
        <div className="mt-1.5 text-small opacity-90">Ganas 50 QueuePoints por cada entrega comunitaria.</div>
      </div>

      <Card className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-button bg-points-soft text-points-strong">
          <Icon name="bike" size={20} />
        </span>
        <div>
          <div className="text-small font-bold text-ink">¿Cómo ganas QueuePoints?</div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
            Gana 50 QueuePoints cada vez que completas una entrega comunitaria para otro estudiante. Son tu reputación
            dentro del campus.
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <span className="ql-section-label">Movimientos</span>
        {movimientos.loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={64} rounded="rounded-card" />
            ))}
          </div>
        ) : movimientos.error ? (
          <ErrorState error={movimientos.error} onRetry={movimientos.refetch} />
        ) : lista.length === 0 ? (
          <EmptyState
            icon="bolt"
            title="Aún no tienes movimientos"
            description="Los QueuePoints los ganan los repartidores por sus entregas. Como cliente verás aquí cualquier movimiento de tu cuenta."
          />
        ) : (
          <>
            <Card pad="none">
              {lista.map((mov, i) => (
                <div
                  key={mov.id}
                  className={cn('flex items-center justify-between gap-3 px-4 py-3', i > 0 && 'border-t border-line')}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-pill',
                        mov.monto >= 0 ? 'bg-points-soft text-points-strong' : 'bg-surface-muted text-ink-muted',
                      )}
                    >
                      <Icon name={mov.monto >= 0 ? 'bolt' : 'tag'} size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-small font-semibold text-ink">
                        {mov.descripcion ?? TIPO_MOVIMIENTO_LABELS[mov.tipo]}
                      </div>
                      <div className="text-[11.5px] text-ink-muted">
                        {TIPO_MOVIMIENTO_LABELS[mov.tipo]} · {formatFechaHora(mov.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-bold tabular-nums',
                      mov.monto >= 0 ? 'text-points-strong' : 'text-ink-soft',
                    )}
                  >
                    {mov.monto >= 0 ? '+' : ''}
                    {formatInt(mov.monto)}
                  </span>
                </div>
              ))}
            </Card>
            {movimientos.data && (
              <Pagination page={page} size={size} total={movimientos.data.totalElements} onPage={setPage} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
