import { useEffect, useRef } from 'react';
import { endpoints, http } from '@/api';
import { useApi, useEventStream } from '@/hooks';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { usePageChrome, PageActions } from '@/components/layout';
import { cn } from '@/lib/cn';
import type { EstadoPedido, PedidoResponse } from '@/types';
import { MetricCard } from '../components/MetricCard';
import { QueueColumn } from '../components/QueueColumn';

// columnas del tablero, en el orden del flujo de atencion
const COLUMNAS: EstadoPedido[] = [
  'PAGADO_ESPERANDO_COMERCIO',
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO_PARA_RECOGER',
  'LISTO_PARA_DELIVERY',
];

// El cargando se ve distinto del poblado: columnas tenues con tarjetas fantasma, sin datos.
function ColaSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNAS.map((estado) => (
        <div key={estado} className="flex w-full min-w-[210px] flex-1 flex-col gap-2.5 rounded-card bg-surface-muted p-2.5">
          <div className="flex items-center justify-between px-1.5">
            <Skeleton width="55%" height={12} />
            <Skeleton width={20} height={20} rounded="rounded-pill" />
          </div>
          <Skeleton height={108} rounded="rounded-card" />
          <Skeleton height={108} rounded="rounded-card" />
        </div>
      ))}
    </div>
  );
}

// Cola de pedidos como tablero por estado. Trae todos los pedidos activos de los locales del
// comercio y se mantiene en vivo: un stream SSE avisa cada cambio de estado y volvemos a
// pedir la cola para reflejarlo.
export default function Queue() {
  // el tablero respira mejor con un ancho mayor que el resto del panel
  usePageChrome('Cola de pedidos', { maxWidth: 1280 });

  const { data, loading, error, refetch } = useApi<PedidoResponse[]>(
    (signal) => http.get(endpoints.comercio.pedidos.cola, { signal }),
    [],
  );

  const streamStatus = useEventStream(endpoints.comercio.pedidos.stream, {
    event: 'pedido-estado',
    onMessage: () => refetch(),
  });

  // el stream en vivo no siempre se sostiene detras del proxy del deploy; cuando no esta
  // abierto refrescamos la cola por sondeo para no quedar desactualizados
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  useEffect(() => {
    if (streamStatus === 'open') return;
    const intervalo = setInterval(() => refetchRef.current(), 5000);
    return () => clearInterval(intervalo);
  }, [streamStatus]);

  const cola = data ?? [];
  const porEstado = (estado: EstadoPedido) => cola.filter((p) => p.estado === estado);

  // con el stream abierto avisamos "En vivo"; si no, el sondeo mantiene la cola al dia
  const enVivo = (
    <span className="inline-flex items-center gap-1.5 text-small font-semibold text-ink-soft">
      <span className={cn('h-2 w-2 rounded-full', streamStatus === 'open' ? 'bg-accent' : 'bg-ink-muted')} />
      {streamStatus === 'open' ? 'En vivo' : 'Actualización automática'}
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageActions>
        {enVivo}
        <Button variant="secondary" size="sm" icon="refresh" onClick={refetch}>
          Actualizar
        </Button>
      </PageActions>

      {loading && !data ? (
        <ColaSkeleton />
      ) : error ? (
        <EmptyState
          icon="wifiOff"
          title="No pudimos cargar la cola"
          description={error.message}
          action={
            <Button icon="refresh" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : cola.length === 0 ? (
        <EmptyState
          icon="layoutGrid"
          title="No hay pedidos en la cola"
          description="Cuando entre un pedido nuevo aparecerá aquí al instante."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <MetricCard icon="layoutGrid" label="En cola" value={cola.length} tone="brand" />
            <MetricCard icon="bell" label="Por aceptar" value={porEstado('PAGADO_ESPERANDO_COMERCIO').length} tone="warning" />
            <MetricCard icon="handPlatter" label="En preparación" value={porEstado('EN_PREPARACION').length} />
            <MetricCard
              icon="checkCheck"
              label="Listos"
              value={porEstado('LISTO_PARA_RECOGER').length + porEstado('LISTO_PARA_DELIVERY').length}
              tone="success"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUMNAS.map((estado) => (
              <QueueColumn key={estado} estado={estado} pedidos={porEstado(estado)} onChanged={refetch} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
