import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageSearch, RefreshCw, TriangleAlert } from "lucide-react";
import { repartidorApi } from "@/api";
import { Button, EmptyState, Skeleton, useToast } from "@/components/ui";
import { useFetch } from "@/hooks";
import { userFacingMessage } from "@/lib/errors";
import { SolicitudCard } from "../components/SolicitudCard";

/** Solicitudes en BUSCANDO que el repartidor puede tomar (GET /repartidor/pedidos-disponibles). */
export default function DisponiblesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch(() =>
    repartidorApi.listDisponibles(),
  );
  const [busyId, setBusyId] = useState<number | null>(null);

  async function aceptar(id: number) {
    setBusyId(id);
    try {
      await repartidorApi.aceptarSolicitud(id);
      toast.success(
        "Tomaste la solicitud. Dirígete al local a recoger el pedido.",
      );
      navigate(`/repartidor/solicitudes/${id}`);
    } catch (err) {
      // 422 si otro repartidor la tomó primero → refrescar la lista.
      toast.error(userFacingMessage(err));
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h1 font-bold text-content">
          Solicitudes disponibles
        </h2>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw size={16} />}
          onClick={refetch}
          loading={loading && !!data}
        >
          Actualizar
        </Button>
      </header>

      {loading && !data ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-card" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar las solicitudes"
          description={userFacingMessage(error)}
          action={
            <Button variant="secondary" size="sm" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No hay solicitudes disponibles"
          description="Cuando un local necesite un repartidor, la solicitud aparecerá aquí. Actualiza para revisar."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data!.map((s) => (
            <SolicitudCard
              key={s.id}
              solicitud={s}
              footer={
                <Button
                  size="sm"
                  loading={busyId === s.id}
                  onClick={() => aceptar(s.id)}
                >
                  Tomar solicitud
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
