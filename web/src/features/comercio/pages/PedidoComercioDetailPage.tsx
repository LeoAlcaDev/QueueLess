import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Receipt, TriangleAlert } from "lucide-react";
import { pedidosComercioApi } from "@/api";
import {
  Button,
  Card,
  EmptyState,
  OrderStatusBadge,
  Spinner,
} from "@/components/ui";
import { useFetch, useSse } from "@/hooks";
import { isApiError, userFacingMessage } from "@/lib/errors";
import { formatDateTime, formatSoles } from "@/lib/format";
import { humanizeEnum } from "@/lib/labels";
import type { CambioEstadoSse, EstadoPedido } from "@/types";
import { AccionesPedido } from "../components/AccionesPedido";

const TERMINAL: EstadoPedido[] = [
  "ENTREGADO",
  "CANCELADO_POR_CLIENTE",
  "CANCELADO_POR_COMERCIO",
  "EXPIRADO",
];

/** Detalle de un pedido del comercio + seguimiento en vivo + acciones (MAPA §4). */
export default function PedidoComercioDetailPage() {
  const { id } = useParams();
  const pedidoId = Number(id);

  const core = useFetch(
    () => pedidosComercioApi.getPedido(pedidoId),
    [pedidoId],
  );
  const pedido = core.data;
  const estado = pedido?.estado;
  const terminal = !!estado && TERMINAL.includes(estado);

  useSse<CambioEstadoSse>("/api/v1/comercio/pedidos/stream", {
    event: "pedido-estado",
    enabled: !!pedido && !terminal,
    onMessage: (ev) => {
      if (ev.pedidoId === pedidoId) core.refetch();
    },
  });

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
          notFound
            ? "No existe o no es de uno de tus locales."
            : userFacingMessage(core.error)
        }
        action={
          <Link to="/comercio">
            <Button variant="secondary" size="sm">
              Volver a la cola
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/comercio"
        className="inline-flex items-center gap-1.5 self-start text-small font-medium text-content-secondary hover:text-content"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Cola de pedidos
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
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-body font-semibold text-content">Total</span>
          <span className="text-h3 font-bold text-content">
            {formatSoles(pedido.total)}
          </span>
        </div>
      </Card>

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
            value={`${formatDateTime(pedido.canceladoAt)}${
              pedido.motivoCancelacion
                ? ` · ${pedido.detalleCancelacion ?? humanizeEnum(pedido.motivoCancelacion)}`
                : ""
            }`}
          />
        )}
      </Card>

      <div className="border-t border-line pt-4">
        <AccionesPedido pedido={pedido} onChanged={core.refetch} />
      </div>
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
