import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http, endpoints } from '@/api';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Button, Card, ConfirmDialog, Price, Skeleton, StateBanner } from '@/components/ui';
import { paths } from '@/routes/paths';
import {
  MOTIVO_CANCELACION_LABELS,
  TIPO_ENTREGA_LABELS,
  type CancelarPedidoRequest,
  type EstadoPedido,
  type PedidoResponse,
  type PuntoDeVentaResponse,
} from '@/types';
import { BackLink, ErrorState, OrderTimeline } from '../components';
import { formatFechaHora } from '../lib/format';

// Antes de ACEPTADO el cliente todavía puede cancelar; después ya no.
const CANCELABLES: EstadoPedido[] = ['PENDIENTE_PAGO', 'PAGADO_BUSCANDO_REPARTIDOR', 'PAGADO_ESPERANDO_COMERCIO'];
const TERMINALES: EstadoPedido[] = ['ENTREGADO', 'CANCELADO_POR_CLIENTE', 'CANCELADO_POR_COMERCIO', 'EXPIRADO'];
const LISTOS: EstadoPedido[] = ['LISTO_PARA_RECOGER', 'LISTO_PARA_DELIVERY'];

export default function OrderDetail() {
  const { id = '' } = useParams();
  const toast = useToast();

  const detalle = useApi<PedidoResponse>(
    (signal) => http.get(endpoints.cliente.pedidos.detail(id), { signal }),
    [id],
  );
  const locales = useApi<PuntoDeVentaResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.list, { signal }),
    [],
  );

  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  const cancelar = useAsyncAction((body: CancelarPedidoRequest) =>
    http.post<PedidoResponse>(endpoints.cliente.pedidos.cancelar(id), body),
  );
  const reintentar = useAsyncAction(() =>
    http.post<PedidoResponse>(endpoints.cliente.pedidos.reintentarDelivery(id)),
  );
  const cambiarAPickup = useAsyncAction(() =>
    http.post<PedidoResponse>(endpoints.cliente.pedidos.cambiarAPickup(id)),
  );

  const pedido = detalle.data;
  const nombreLocal = useMemo(() => {
    if (!pedido) return undefined;
    const local = (locales.data ?? []).find((l) => l.id === pedido.puntoDeVentaId);
    return local?.nombre;
  }, [locales.data, pedido]);

  usePageChrome(pedido ? `Pedido ${pedido.codigo}` : 'Pedido', {
    sub: pedido ? `${nombreLocal ?? `Local #${pedido.puntoDeVentaId}`} · ${TIPO_ENTREGA_LABELS[pedido.tipoEntrega]}` : undefined,
    maxWidth: 900,
  });

  if (detalle.loading) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink to={paths.cliente.pedidos} />
        <Skeleton height={120} rounded="rounded-card" />
        <Skeleton height={200} rounded="rounded-card" />
      </div>
    );
  }
  if (detalle.error) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink to={paths.cliente.pedidos} />
        <ErrorState error={detalle.error} onRetry={detalle.refetch} title="No pudimos cargar el pedido" />
      </div>
    );
  }
  if (!pedido) return null;

  const esDelivery = pedido.tipoEntrega === 'DELIVERY';
  const puedeCancelar = CANCELABLES.includes(pedido.estado);
  const puedePagar = pedido.estado === 'PENDIENTE_PAGO';
  const puedeVerQr = LISTOS.includes(pedido.estado);
  const puedeResenar = pedido.estado === 'ENTREGADO';
  const enCurso = !TERMINALES.includes(pedido.estado);
  // un delivery atascado buscando repartidor puede reintentar o pasar a recojo
  const deliveryAtascado = esDelivery && pedido.estado === 'PAGADO_BUSCANDO_REPARTIDOR';

  const accionError = cancelar.error ?? reintentar.error ?? cambiarAPickup.error;

  const hacerCancelar = async () => {
    const res = await cancelar.run({ razon: null });
    setConfirmarCancelar(false);
    if (res) {
      toast.success('Pedido cancelado.');
      detalle.refetch();
    }
  };

  const hacerReintentar = async () => {
    const res = await reintentar.run();
    if (res) {
      toast.success('Reanudamos la búsqueda de repartidor.');
      detalle.refetch();
    }
  };

  const hacerCambioPickup = async () => {
    const res = await cambiarAPickup.run();
    if (res) {
      toast.success('Tu pedido ahora es para recojo en tienda.');
      detalle.refetch();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to={paths.cliente.pedidos} />

      {accionError && (
        <StateBanner tone="warning" title="No se pudo completar la acción">
          {accionError.message}
        </StateBanner>
      )}

      {pedido.estado.startsWith('CANCELADO') && pedido.motivoCancelacion && (
        <StateBanner tone="error" title="Pedido cancelado">
          {MOTIVO_CANCELACION_LABELS[pedido.motivoCancelacion]}
          {pedido.detalleCancelacion ? ` · ${pedido.detalleCancelacion}` : ''}
        </StateBanner>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-3">
            <h2 className="ql-h3">Progreso</h2>
            <OrderTimeline estado={pedido.estado} tipoEntrega={pedido.tipoEntrega} />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="ql-h3">Productos</h2>
            <div className="flex flex-col divide-y divide-line">
              {pedido.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-small text-ink">
                    <span className="font-bold tabular-nums">{item.cantidad}×</span> {item.nombre}
                  </span>
                  <Price amount={item.subtotal} strong={false} className="text-small" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <Row label="Subtotal" value={pedido.subtotal} />
              {pedido.descuentoQpts > 0 && <Row label="Descuento QueuePoints" value={-pedido.descuentoQpts} />}
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Total</span>
                <Price amount={pedido.total} />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-2.5">
            <h2 className="ql-h3">Acciones</h2>

            {puedePagar && (
              <Link to={paths.cliente.pago(pedido.id)}>
                <Button full icon="creditCard">
                  Pagar
                </Button>
              </Link>
            )}
            {puedeVerQr && (
              <Link to={paths.cliente.qr(pedido.id)}>
                <Button full icon="qr">
                  Ver QR de entrega
                </Button>
              </Link>
            )}
            {puedeResenar && (
              <Link to={paths.cliente.resena(pedido.id)}>
                <Button full icon="star">
                  Dejar reseña
                </Button>
              </Link>
            )}
            {enCurso && (
              <Link to={paths.cliente.seguimiento(pedido.id)}>
                <Button full variant="secondary" icon="chart">
                  Seguimiento en vivo
                </Button>
              </Link>
            )}
            {deliveryAtascado && (
              <>
                <Button full variant="secondary" icon="refresh" loading={reintentar.loading} onClick={hacerReintentar}>
                  Reintentar delivery
                </Button>
                <Button full variant="secondary" icon="handPlatter" loading={cambiarAPickup.loading} onClick={hacerCambioPickup}>
                  Cambiar a recojo
                </Button>
              </>
            )}
            {puedeCancelar && (
              <Button full variant="destructive" icon="x" onClick={() => setConfirmarCancelar(true)}>
                Cancelar pedido
              </Button>
            )}
          </Card>

          <Card className="flex flex-col gap-1.5 text-small text-ink-soft">
            <Linea label="Creado" valor={formatFechaHora(pedido.creadoAt)} />
            {pedido.pagadoAt && <Linea label="Pagado" valor={formatFechaHora(pedido.pagadoAt)} />}
            {pedido.listoAt && <Linea label="Listo" valor={formatFechaHora(pedido.listoAt)} />}
            {pedido.entregadoAt && <Linea label="Entregado" valor={formatFechaHora(pedido.entregadoAt)} />}
            {pedido.recojoProgramadoAt && <Linea label="Programado" valor={formatFechaHora(pedido.recojoProgramadoAt)} />}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmarCancelar}
        onClose={() => setConfirmarCancelar(false)}
        onConfirm={hacerCancelar}
        title="¿Cancelar este pedido?"
        description="Si ya pagaste, se gestionará el reembolso según el estado del pedido."
        confirmLabel="Sí, cancelar"
        cancelLabel="No"
        destructive
        loading={cancelar.loading}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-small text-ink-soft">
      <span>{label}</span>
      <Price amount={value} strong={false} />
    </div>
  );
}

function Linea({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="tabular-nums text-ink-soft">{valor}</span>
    </div>
  );
}
