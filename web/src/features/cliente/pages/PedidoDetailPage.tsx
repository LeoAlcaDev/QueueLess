import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  QrCode,
  Receipt,
  RefreshCw,
  ShoppingBag,
  TriangleAlert,
  X,
} from "lucide-react";
import { pedidosClienteApi } from "@/api";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  OrderStatusBadge,
  Spinner,
  useToast,
} from "@/components/ui";
import { useFetch, useSse } from "@/hooks";
import { isApiError, userFacingMessage } from "@/lib/errors";
import { formatDateTime, formatSoles } from "@/lib/format";
import type { CambioEstadoSse, EstadoPedido } from "@/types";
import { PagoPanel } from "../components/PagoPanel";
import { QrModal } from "../components/QrModal";
import { ResenaForm } from "../components/ResenaForm";

const TERMINAL: EstadoPedido[] = [
  "ENTREGADO",
  "CANCELADO_POR_CLIENTE",
  "CANCELADO_POR_COMERCIO",
  "EXPIRADO",
];
const CANCELABLES: EstadoPedido[] = [
  "PENDIENTE_PAGO",
  "PAGADO_BUSCANDO_REPARTIDOR",
  "PAGADO_ESPERANDO_COMERCIO",
  "ACEPTADO",
];

/** Detalle de pedido + seguimiento en vivo (SSE) + acciones por estado (MAPA §4). */
export default function PedidoDetailPage() {
  const { id } = useParams();
  const pedidoId = Number(id);
  const toast = useToast();

  const core = useFetch(
    () => pedidosClienteApi.getPedido(pedidoId),
    [pedidoId],
  );
  const pedido = core.data;
  const estado = pedido?.estado;
  const terminal = !!estado && TERMINAL.includes(estado);

  const [acting, setActing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [razon, setRazon] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [resenaHecha, setResenaHecha] = useState(false);

  // Seguimiento en vivo: el stream del cliente emite todos sus pedidos; filtramos.
  useSse<CambioEstadoSse>("/api/v1/cliente/pedidos/stream", {
    event: "pedido-estado",
    enabled: !!pedido && !terminal,
    onMessage: (ev) => {
      if (ev.pedidoId === pedidoId) core.refetch();
    },
  });

  async function runAction(fn: () => Promise<unknown>, okMsg?: string) {
    setActing(true);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
    } catch (err) {
      // 422 transición ilegal → mensaje + refrescar (el botón ya no debería estar).
      toast.error(userFacingMessage(err));
    } finally {
      core.refetch();
      setActing(false);
    }
  }

  function confirmarCancelar() {
    setCancelOpen(false);
    void runAction(
      () =>
        pedidosClienteApi.cancelarPedido(pedidoId, {
          razon: razon.trim() || undefined,
        }),
      "Pedido cancelado.",
    );
    setRazon("");
  }

  if (core.loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size={24} />
      </div>
    );
  }

  if (core.error || !pedido) {
    const notFound = isApiError(core.error) && core.error.status === 404;
    return (
      <EmptyState
        icon={notFound ? Receipt : TriangleAlert}
        title={
          notFound
            ? "No encontramos este pedido"
            : "No pudimos cargar el pedido"
        }
        description={
          notFound ? "No existe o no es tuyo." : userFacingMessage(core.error)
        }
        action={
          <Link to="/cliente/pedidos">
            <Button variant="secondary" size="sm">
              Ver mis pedidos
            </Button>
          </Link>
        }
      />
    );
  }

  const isListo =
    estado === "LISTO_PARA_RECOGER" || estado === "LISTO_PARA_DELIVERY";
  const puedeCancelar = !!estado && CANCELABLES.includes(estado);

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/cliente/pedidos"
        className="inline-flex items-center gap-1.5 self-start text-small font-medium text-content-secondary hover:text-content"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Mis pedidos
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-h1 font-bold text-content">#{pedido.codigo}</h2>
          <OrderStatusBadge state={pedido.estado} />
        </div>
        <span className="text-small text-content-secondary">
          {pedido.tipoEntrega === "DELIVERY" ? "Delivery" : "Pickup"}
        </span>
      </header>

      {/* Items y totales */}
      <Card className="flex flex-col gap-3">
        <ul className="flex flex-col divide-y divide-line">
          {pedido.items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 py-2 first:pt-0"
            >
              <span className="text-body text-content">
                {it.cantidad}× {it.nombre}
              </span>
              <span className="text-body text-content-secondary">
                {formatSoles(it.subtotal)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1 border-t border-line pt-3 text-small">
          <Row label="Subtotal" value={formatSoles(pedido.subtotal)} />
          {pedido.descuentoQpts > 0 && (
            <Row
              label="Descuento QueuePoints"
              value={`− ${formatSoles(pedido.descuentoQpts)}`}
            />
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-body font-semibold text-content">Total</span>
            <span className="text-h3 font-bold text-content">
              {formatSoles(pedido.total)}
            </span>
          </div>
        </div>
      </Card>

      {/* Línea de tiempo */}
      <Card className="flex flex-col gap-1 text-small">
        <Row label="Creado" value={formatDateTime(pedido.creadoAt)} />
        {pedido.pagadoAt && (
          <Row label="Pagado" value={formatDateTime(pedido.pagadoAt)} />
        )}
        {pedido.aceptadoAt && (
          <Row label="Aceptado" value={formatDateTime(pedido.aceptadoAt)} />
        )}
        {pedido.listoAt && (
          <Row label="Listo" value={formatDateTime(pedido.listoAt)} />
        )}
        {pedido.entregadoAt && (
          <Row label="Entregado" value={formatDateTime(pedido.entregadoAt)} />
        )}
        {pedido.canceladoAt && (
          <Row
            label="Cancelado"
            value={`${formatDateTime(pedido.canceladoAt)}${pedido.motivoCancelacion ? ` · ${pedido.detalleCancelacion ?? pedido.motivoCancelacion}` : ""}`}
          />
        )}
      </Card>

      {/* Acciones por estado */}
      <div className="flex flex-col gap-3">
        {estado === "PENDIENTE_PAGO" && (
          <PagoPanel
            pedidoId={pedido.id}
            total={pedido.total}
            onConfirmed={core.refetch}
          />
        )}

        {estado === "PAGADO_BUSCANDO_REPARTIDOR" && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={16} />}
              loading={acting}
              onClick={() =>
                runAction(
                  () => pedidosClienteApi.reintentarBusquedaDelivery(pedido.id),
                  "Reintentando la búsqueda…",
                )
              }
            >
              Reintentar búsqueda
            </Button>
            <Button
              variant="secondary"
              leftIcon={<ShoppingBag size={16} />}
              loading={acting}
              onClick={() =>
                runAction(
                  () => pedidosClienteApi.cambiarAPickup(pedido.id),
                  "Cambiado a pickup.",
                )
              }
            >
              Cambiar a pickup
            </Button>
          </div>
        )}

        {isListo && (
          <Button
            leftIcon={<QrCode size={18} />}
            onClick={() => setQrOpen(true)}
          >
            Mostrar QR de entrega
          </Button>
        )}

        {estado === "ENTREGADO" && !resenaHecha && (
          <ResenaForm
            pedidoId={pedido.id}
            onDone={() => setResenaHecha(true)}
          />
        )}

        {puedeCancelar && (
          <Button
            variant="ghost"
            leftIcon={<X size={16} />}
            disabled={acting}
            onClick={() => setCancelOpen(true)}
            className="self-start text-error-fg"
          >
            Cancelar pedido
          </Button>
        )}
      </div>

      <QrModal
        pedidoId={pedido.id}
        codigo={pedido.codigo}
        open={qrOpen}
        onClose={() => setQrOpen(false)}
      />

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar pedido"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={confirmarCancelar}>
              Sí, cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-body text-content-secondary">
            ¿Seguro que quieres cancelar este pedido? Si ya pagaste, se gestiona
            el reembolso.
          </p>
          <Input
            label="Motivo (opcional)"
            value={razon}
            onChange={(e) => setRazon(e.target.value)}
            placeholder="Ej. me equivoqué de local"
          />
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-content-secondary">{label}</span>
      <span className="text-content">{value}</span>
    </div>
  );
}
