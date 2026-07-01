import { type ReactNode, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http, endpoints } from '@/api';
import { useApi, useEventStream } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Button, Card, Icon, type IconName, Skeleton, StatusPill } from '@/components/ui';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import { TIPO_ENTREGA_LABELS, type EstadoPedido, type PedidoResponse, type PuntoDeVentaResponse } from '@/types';
import { formatSoles } from '@/lib/format';
import { BackLink, ErrorState, OrderTimeline, ProgressRing } from '../components';

// Lo que viaja por el stream SSE cuando un pedido cambia de estado (ver el backend).
interface CambioEstadoSse {
  pedidoId: number;
  estadoNuevo: string;
}

const LISTOS: EstadoPedido[] = ['LISTO_PARA_RECOGER', 'LISTO_PARA_DELIVERY'];
const CANCELADOS: EstadoPedido[] = ['CANCELADO_POR_CLIENTE', 'CANCELADO_POR_COMERCIO', 'EXPIRADO'];

export default function OrderTracking() {
  const { id = '' } = useParams();
  usePageChrome('Seguimiento del pedido', { maxWidth: 760 });

  const detalle = useApi<PedidoResponse>(
    (signal) => http.get(endpoints.cliente.pedidos.detail(id), { signal }),
    [id],
  );
  const locales = useApi<PuntoDeVentaResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.list, { signal }),
    [],
  );

  // el stream es global del cliente: filtramos por este pedido y refrescamos su detalle
  const status = useEventStream(endpoints.cliente.pedidos.stream, {
    event: 'pedido-estado',
    onMessage: (data) => {
      const evento = data as CambioEstadoSse;
      if (evento && evento.pedidoId === Number(id)) {
        detalle.refetch();
      }
    },
  });

  // si el stream en vivo no esta disponible, sondeamos el detalle para reflejar los cambios
  const refetchRef = useRef(detalle.refetch);
  refetchRef.current = detalle.refetch;
  useEffect(() => {
    if (status === 'open') return;
    const intervalo = setInterval(() => refetchRef.current(), 5000);
    return () => clearInterval(intervalo);
  }, [status]);

  const pedido = detalle.data;
  const nombreLocal = pedido
    ? (locales.data ?? []).find((l) => l.id === pedido.puntoDeVentaId)?.nombre
    : undefined;
  const enVivo = status === 'open';

  return (
    <div className="mx-auto flex w-full max-w-[620px] flex-col gap-5">
      <BackLink to={id ? paths.cliente.pedido(id) : paths.cliente.pedidos} />

      {detalle.loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton height={180} rounded="rounded-card" />
          <Skeleton height={220} rounded="rounded-card" />
        </div>
      ) : detalle.error ? (
        <ErrorState error={detalle.error} onRetry={detalle.refetch} title="No pudimos cargar el pedido" />
      ) : !pedido ? null : (
        <>
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <Feature estado={pedido.estado} />
          </div>

          {!CANCELADOS.includes(pedido.estado) && (
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="ql-section-label">Progreso del pedido</span>
                {enVivo && (
                  <span className="inline-flex items-center gap-1.5 text-badge font-semibold text-accent-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    En vivo
                  </span>
                )}
              </div>
              <OrderTimeline estado={pedido.estado} tipoEntrega={pedido.tipoEntrega} />
            </Card>
          )}

          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-small font-bold text-ink">
                  {nombreLocal ?? `Local #${pedido.puntoDeVentaId}`}
                </div>
                <div className="font-mono text-[12px] text-ink-muted">
                  {pedido.codigo} · {TIPO_ENTREGA_LABELS[pedido.tipoEntrega]}
                </div>
              </div>
              <StatusPill estado={pedido.estado} />
            </div>
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              {pedido.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-small">
                  <span className="text-ink-soft">
                    <span className="font-bold tabular-nums text-ink">{item.cantidad}×</span> {item.nombre}
                  </span>
                  <span className="tabular-nums text-ink">{formatSoles(item.subtotal)}</span>
                </div>
              ))}
              {pedido.descuentoQpts > 0 && (
                <div className="flex items-center justify-between text-small text-points-strong">
                  <span>Descuento QueuePoints</span>
                  <span className="tabular-nums">- {formatSoles(pedido.descuentoQpts)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="font-bold text-ink">Total</span>
                <span className="text-[15px] font-bold tabular-nums text-ink">{formatSoles(pedido.total)}</span>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2.5">
            {pedido.estado === 'PENDIENTE_PAGO' && (
              <Link to={paths.cliente.pago(pedido.id)}>
                <Button full icon="creditCard">
                  Pagar {formatSoles(pedido.total)}
                </Button>
              </Link>
            )}
            {LISTOS.includes(pedido.estado) && (
              <Link to={paths.cliente.qr(pedido.id)}>
                <Button full icon="qr">
                  Mostrar QR
                </Button>
              </Link>
            )}
            {pedido.estado === 'ENTREGADO' && (
              <Link to={paths.cliente.resena(pedido.id)}>
                <Button full icon="star">
                  Dejar reseña
                </Button>
              </Link>
            )}
            <Link to={paths.cliente.pedido(pedido.id)}>
              <Button full variant="secondary" icon="receipt">
                Ver detalle del pedido
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// El "momento" del pedido: un anillo de espera, un check de listo/entregado o un aviso de
// cancelacion. ACEPTADO y EN_PREPARACION usan colores distintos a proposito.
function Feature({ estado }: { estado: EstadoPedido }) {
  switch (estado) {
    case 'PENDIENTE_PAGO':
      return (
        <Waiting
          tone="info"
          icon="creditCard"
          label="Tu pedido está reservado. Completa el pago para que el comercio lo prepare."
        />
      );
    case 'PAGADO_BUSCANDO_REPARTIDOR':
      return (
        <Waiting
          tone="points"
          icon="bike"
          spinning
          label="Buscando un repartidor disponible para tu entrega comunitaria."
        />
      );
    case 'PAGADO_ESPERANDO_COMERCIO':
      return <Waiting tone="info" icon="store" spinning label="Tu pedido llegó al comercio. Esperando que lo acepte." />;
    case 'ACEPTADO':
      return (
        <Waiting tone="brand" icon="handPlatter" spinning label="El comercio aceptó tu pedido y empezará a prepararlo." />
      );
    case 'EN_PREPARACION':
      return (
        <Waiting tone="warning" icon="utensils" spinning label="Tu pedido se está preparando. Te avisamos cuando esté listo." />
      );
    case 'LISTO_PARA_RECOGER':
    case 'LISTO_PARA_DELIVERY':
      return (
        <Done
          tone="success"
          icon="checkCircle"
          title="¡Tu pedido está listo!"
          desc={`Muestra tu QR ${estado === 'LISTO_PARA_DELIVERY' ? 'al repartidor' : 'en el mostrador'} para recogerlo.`}
        />
      );
    case 'ENTREGADO':
      return <Done tone="success" icon="checkCheck" title="Pedido entregado" desc="Gracias por usar QueueLess." />;
    default:
      return (
        <Done
          tone="error"
          icon="xCircle"
          title={estado === 'EXPIRADO' ? 'Pedido expirado' : 'Pedido cancelado'}
          desc="Este pedido no continuó su preparación."
        />
      );
  }
}

function Waiting({
  tone,
  icon,
  label,
  spinning,
}: {
  tone: 'brand' | 'info' | 'points' | 'warning';
  icon: IconName;
  label: string;
  spinning?: boolean;
}) {
  return (
    <>
      <ProgressRing tone={tone} icon={icon} spinning={spinning} />
      <p className="max-w-sm text-small text-ink-soft">{label}</p>
    </>
  );
}

function Done({
  tone,
  icon,
  title,
  desc,
}: {
  tone: 'success' | 'error';
  icon: IconName;
  title: string;
  desc: ReactNode;
}) {
  const box = tone === 'success' ? 'bg-success-bg text-success-fg' : 'bg-error-bg text-error-fg';
  return (
    <>
      <span className={cn('grid h-16 w-16 place-items-center rounded-pill', box)}>
        <Icon name={icon} size={32} />
      </span>
      <div>
        <div className="text-h3 font-bold text-ink">{title}</div>
        <p className="text-small text-ink-soft">{desc}</p>
      </div>
    </>
  );
}
