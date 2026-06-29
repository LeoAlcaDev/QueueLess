import { ClipboardList, RefreshCw, TriangleAlert, Wifi } from "lucide-react";
import { pedidosComercioApi } from "@/api";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { useFetch, useSse } from "@/hooks";
import { userFacingMessage } from "@/lib/errors";
import type { CambioEstadoSse, EstadoPedido } from "@/types";
import { ColaPedidoCard } from "../components/ColaPedidoCard";

// Orden de atención: lo que requiere acción del comercio primero.
const PRIORIDAD: Record<EstadoPedido, number> = {
  PAGADO_ESPERANDO_COMERCIO: 0,
  EN_PREPARACION: 1,
  ACEPTADO: 2,
  LISTO_PARA_RECOGER: 3,
  LISTO_PARA_DELIVERY: 4,
  PAGADO_BUSCANDO_REPARTIDOR: 5,
  PENDIENTE_PAGO: 6,
  ENTREGADO: 7,
  CANCELADO_POR_CLIENTE: 8,
  CANCELADO_POR_COMERCIO: 9,
  EXPIRADO: 10,
};

/** Cola de pedidos en vivo (GET /comercio/pedidos/cola + SSE). El centro del panel. */
export default function ColaPage() {
  const cola = useFetch(() => pedidosComercioApi.getCola());

  // El stream del comercio reemite cualquier cambio de estado de sus locales:
  // ante cada evento, re-fetcheamos la cola (evita carreras con las acciones).
  useSse<CambioEstadoSse>("/api/v1/comercio/pedidos/stream", {
    event: "pedido-estado",
    onMessage: () => cola.refetch(),
  });

  const pedidos = (cola.data ?? [])
    .slice()
    .sort(
      (a, b) =>
        PRIORIDAD[a.estado] - PRIORIDAD[b.estado] ||
        a.creadoAt.localeCompare(b.creadoAt),
    );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-h1 font-bold text-content">Cola de pedidos</h2>
          <span className="inline-flex items-center gap-1 rounded-pill bg-success-bg px-2.5 py-1 text-badge font-semibold text-success-fg">
            <Wifi size={13} aria-hidden="true" />
            En vivo
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw size={16} />}
          onClick={cola.refetch}
          loading={cola.loading && !!cola.data}
        >
          Actualizar
        </Button>
      </header>

      {cola.loading && !cola.data ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-card" />
          ))}
        </div>
      ) : cola.error ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar la cola"
          description={userFacingMessage(cola.error)}
          action={
            <Button variant="secondary" size="sm" onClick={cola.refetch}>
              Reintentar
            </Button>
          }
        />
      ) : pedidos.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay pedidos en cola"
          description="Cuando entre un pedido, aparecerá aquí automáticamente."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {pedidos.map((pedido) => (
            <ColaPedidoCard
              key={pedido.id}
              pedido={pedido}
              onChanged={cola.refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
