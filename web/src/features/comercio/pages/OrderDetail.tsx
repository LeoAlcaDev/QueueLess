import { useNavigate, useParams } from 'react-router-dom';
import { endpoints, http } from '@/api';
import { useApi } from '@/hooks';
import { Button, Card, EmptyState, Icon, Price, Skeleton, StateBanner, StatusPill } from '@/components/ui';
import { usePageChrome } from '@/components/layout';
import { paths } from '@/routes/paths';
import {
  MOTIVO_CANCELACION_LABELS,
  TIPO_ENTREGA_LABELS,
  type PedidoResponse,
} from '@/types';
import { formatFechaHora } from '../utils';
import { OrderActions } from '../components/OrderActions';

function Linea({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-small">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

// Detalle completo de un pedido: items, totales, estado y tiempos, con las mismas acciones de
// la cola mas el cierre por codigo y la cancelacion cuando corresponde.
export default function OrderDetail() {
  usePageChrome('Detalle de pedido', { maxWidth: 760 });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useApi<PedidoResponse>(
    (signal) => http.get(endpoints.comercio.pedidos.detail(id!), { signal }),
    [id],
  );

  const volver = (
    <Button variant="ghost" size="sm" icon="arrowLeft" onClick={() => navigate(paths.comercio.cola)}>
      Volver a la cola
    </Button>
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <Skeleton height={28} width="40%" />
        <Skeleton height={200} rounded="rounded-card" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <EmptyState
          icon="receipt"
          title="No encontramos el pedido"
          description={error?.message}
          action={
            <Button icon="refresh" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  const cancelado =
    data.estado === 'CANCELADO_POR_COMERCIO' || data.estado === 'CANCELADO_POR_CLIENTE';

  return (
    <div className="flex flex-col gap-4">
      {volver}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-mono text-h3 font-bold tracking-wide text-ink">{data.codigo}</h2>
          <p className="mt-0.5 text-small text-ink-soft">{TIPO_ENTREGA_LABELS[data.tipoEntrega]}</p>
        </div>
        <StatusPill estado={data.estado} />
      </div>

      {cancelado && data.motivoCancelacion && (
        <StateBanner tone="error" title="Pedido cancelado">
          {MOTIVO_CANCELACION_LABELS[data.motivoCancelacion]}
          {data.detalleCancelacion ? ` — ${data.detalleCancelacion}` : ''}
        </StateBanner>
      )}

      <Card pad="md">
        <div className="ql-section-label mb-3 text-ink-soft">Productos</div>
        <div className="divide-y divide-line">
          {data.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-6 min-w-6 place-items-center rounded-pill bg-surface-muted px-1.5 text-badge font-bold tabular-nums text-ink-soft">
                  {item.cantidad}
                </span>
                <span className="truncate text-small text-ink">{item.nombre}</span>
              </div>
              <Price amount={item.subtotal} strong={false} />
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <Linea label="Subtotal" value={`S/ ${data.subtotal.toFixed(2)}`} />
          {data.descuentoQpts > 0 && (
            <Linea label="Descuento QueuePoints" value={`- S/ ${data.descuentoQpts.toFixed(2)}`} />
          )}
          <div className="mt-1 flex items-center justify-between border-t border-line pt-2.5">
            <span className="text-small font-bold text-ink">Total</span>
            <Price amount={data.total} />
          </div>
        </div>
      </Card>

      <Card pad="md">
        <div className="ql-section-label mb-2 flex items-center gap-1.5 text-ink-soft">
          <Icon name="clock" size={13} /> Tiempos
        </div>
        <Linea label="Creado" value={formatFechaHora(data.creadoAt)} />
        <Linea label="Pagado" value={formatFechaHora(data.pagadoAt)} />
        <Linea label="Aceptado" value={formatFechaHora(data.aceptadoAt)} />
        <Linea label="Listo" value={formatFechaHora(data.listoAt)} />
        <Linea label="Entregado" value={formatFechaHora(data.entregadoAt)} />
        {data.recojoProgramadoAt && (
          <Linea label="Recojo programado" value={formatFechaHora(data.recojoProgramadoAt)} />
        )}
      </Card>

      <OrderActions pedido={data} onChanged={refetch} size="md" context="detail" />
    </div>
  );
}
