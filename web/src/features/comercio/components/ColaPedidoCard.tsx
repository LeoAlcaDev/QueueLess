import { Link } from "react-router-dom";
import { Clock, ExternalLink } from "lucide-react";
import { Card, OrderStatusBadge } from "@/components/ui";
import { formatDateTime, formatSoles } from "@/lib/format";
import type { PedidoResponse } from "@/types";
import { AccionesPedido } from "./AccionesPedido";

/** Tarjeta de un pedido en la cola del comercio con sus acciones por estado. */
export function ColaPedidoCard({
  pedido,
  onChanged,
}: {
  pedido: PedidoResponse;
  onChanged: () => void;
}) {
  const unidades = pedido.items.reduce((acc, it) => acc + it.cantidad, 0);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            to={`/comercio/pedidos/${pedido.id}`}
            className="inline-flex items-center gap-1 text-body font-bold text-content hover:text-content-brand focus-visible:shadow-focus focus-visible:outline-none"
          >
            #{pedido.codigo}
            <ExternalLink size={14} aria-hidden="true" />
          </Link>
          <OrderStatusBadge state={pedido.estado} />
        </div>
        <span className="text-small text-content-secondary">
          {pedido.tipoEntrega === "DELIVERY" ? "Delivery" : "Pickup"}
        </span>
      </div>

      <ul className="flex flex-col gap-0.5 text-small text-content-secondary">
        {pedido.items.map((it) => (
          <li key={it.id}>
            {it.cantidad}× {it.nombre}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 text-small">
        <span className="inline-flex items-center gap-1 text-content-muted">
          <Clock size={13} aria-hidden="true" />
          {formatDateTime(pedido.creadoAt)}
        </span>
        <span className="text-body font-semibold text-content">
          {unidades} {unidades === 1 ? "ítem" : "ítems"} ·{" "}
          {formatSoles(pedido.total)}
        </span>
      </div>

      <div className="border-t border-line pt-3">
        <AccionesPedido pedido={pedido} onChanged={onChanged} size="sm" />
      </div>
    </Card>
  );
}
