import { Link } from "react-router-dom";
import { ChevronRight, Receipt, TriangleAlert } from "lucide-react";
import { pedidosClienteApi } from "@/api";
import {
  Button,
  Card,
  EmptyState,
  OrderStatusBadge,
  Skeleton,
} from "@/components/ui";
import { usePaginated } from "@/hooks";
import { userFacingMessage } from "@/lib/errors";
import { formatDateTime, formatSoles } from "@/lib/format";

/** Mis pedidos (GET /cliente/pedidos paginado) con estado. */
export default function MisPedidosPage() {
  const { items, loading, error, hasMore, loadMore, reload } = usePaginated(
    (params) => pedidosClienteApi.listMisPedidos(params),
    { size: 10, sort: "creadoAt,desc" },
  );

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-card" />
        ))}
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="No pudimos cargar tus pedidos"
        description={userFacingMessage(error)}
        action={
          <Button variant="secondary" size="sm" onClick={reload}>
            Reintentar
          </Button>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Todavía no tienes pedidos"
        description="Cuando hagas tu primer pedido aparecerá aquí."
        action={
          <Link to="/cliente">
            <Button size="sm">Explorar locales</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((p) => (
        <Link
          key={p.id}
          to={`/cliente/pedidos/${p.id}`}
          className="rounded-card focus-visible:shadow-focus focus-visible:outline-none"
        >
          <Card className="flex items-center gap-3 hover:bg-surface-muted">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-body font-semibold text-content">
                  #{p.codigo}
                </span>
                <OrderStatusBadge state={p.estado} />
              </div>
              <p className="text-small text-content-secondary">
                {formatDateTime(p.creadoAt)} ·{" "}
                {p.tipoEntrega === "DELIVERY" ? "Delivery" : "Pickup"}
              </p>
            </div>
            <span className="shrink-0 text-body font-semibold text-content">
              {formatSoles(p.total)}
            </span>
            <ChevronRight
              size={18}
              className="shrink-0 text-content-muted"
              aria-hidden="true"
            />
          </Card>
        </Link>
      ))}

      {hasMore && (
        <Button
          variant="secondary"
          onClick={loadMore}
          loading={loading}
          className="self-center"
        >
          Cargar más
        </Button>
      )}
    </div>
  );
}
