import { Link } from "react-router-dom";
import { ChevronRight, Truck, TriangleAlert } from "lucide-react";
import { repartidorApi } from "@/api";
import { Button, EmptyState, Skeleton } from "@/components/ui";
import { usePaginated } from "@/hooks";
import { userFacingMessage } from "@/lib/errors";
import { SolicitudCard } from "../components/SolicitudCard";

// Solicitudes activas: el repartidor todavía tiene algo que hacer en ellas.
const ACTIVAS = new Set(["ASIGNADO", "RECOGIDO"]);

/** Historial de entregas del repartidor (GET /repartidor/mis-entregas, paginado). */
export default function MisEntregasPage() {
  const entregas = usePaginated(
    (params) => repartidorApi.listMisEntregas(params),
    { size: 10 },
  );

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-h1 font-bold text-content">Mis entregas</h2>

      {entregas.loading && entregas.items.length === 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-card" />
          ))}
        </div>
      ) : entregas.error && entregas.items.length === 0 ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar tus entregas"
          description={userFacingMessage(entregas.error)}
          action={
            <Button variant="secondary" size="sm" onClick={entregas.reload}>
              Reintentar
            </Button>
          }
        />
      ) : entregas.items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Todavía no tienes entregas"
          description="Cuando tomes una solicitud aparecerá aquí con su estado."
          action={
            <Link to="/repartidor">
              <Button size="sm">Ver disponibles</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {entregas.items.map((s) => (
              <SolicitudCard
                key={s.id}
                solicitud={s}
                footer={
                  <Link to={`/repartidor/solicitudes/${s.id}`}>
                    <Button
                      variant={ACTIVAS.has(s.estado) ? "primary" : "ghost"}
                      size="sm"
                    >
                      {ACTIVAS.has(s.estado)
                        ? "Continuar entrega"
                        : "Ver detalle"}
                      <ChevronRight size={16} />
                    </Button>
                  </Link>
                }
              />
            ))}
          </div>

          {entregas.hasMore && (
            <Button
              variant="secondary"
              onClick={entregas.loadMore}
              loading={entregas.loading}
              className="self-center"
            >
              Cargar más
            </Button>
          )}
        </>
      )}
    </div>
  );
}
