import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  MapPin,
  Package,
  PackageCheck,
  Send,
  TriangleAlert,
} from "lucide-react";
import { repartidorApi } from "@/api";
import { Button, Card, EmptyState, Skeleton, useToast } from "@/components/ui";
import { useFetch } from "@/hooks";
import { isApiError, userFacingMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import type { SolicitudDeliveryResponse } from "@/types";
import { ConfirmarEntregaModal } from "../components/ConfirmarEntregaModal";
import { SolicitudEstadoBadge } from "../components/SolicitudEstadoBadge";

/** Detalle de una entrega: confirmar recogida y cerrar con el código (+50 QPts). */
export default function EntregaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const solicitudId = Number(id);
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch(
    () => repartidorApi.getSolicitud(solicitudId),
    [solicitudId],
  );

  const [accionBusy, setAccionBusy] = useState(false);
  const [entregaOpen, setEntregaOpen] = useState(false);

  async function confirmarRecogida() {
    setAccionBusy(true);
    try {
      await repartidorApi.confirmarRecogida(solicitudId);
      toast.success("Recogida confirmada. Lleva el pedido al cliente.");
      refetch();
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setAccionBusy(false);
    }
  }

  async function confirmarEntrega(codigo: string) {
    setAccionBusy(true);
    try {
      await repartidorApi.confirmarEntrega(solicitudId, { codigo });
      toast.success("Entrega confirmada. Ganaste 50 QueuePoints.");
      setEntregaOpen(false);
      refetch();
    } catch (err) {
      // 422 si el código no coincide: el modal sigue abierto para reintentar.
      if (isApiError(err) && err.status === 422)
        toast.error(userFacingMessage(err));
      else {
        toast.error(userFacingMessage(err));
        setEntregaOpen(false);
      }
    } finally {
      setAccionBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-44 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    );
  }

  if (error || !data) {
    const notFound = isApiError(error) && error.status === 404;
    return (
      <EmptyState
        icon={TriangleAlert}
        title={
          notFound
            ? "No encontramos esta entrega"
            : "No pudimos cargar la entrega"
        }
        description={
          notFound
            ? "Puede que ya no esté asignada a ti."
            : userFacingMessage(error)
        }
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/repartidor")}
          >
            Ver disponibles
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/repartidor/entregas"
        className="inline-flex w-fit items-center gap-1 text-small text-content-secondary hover:text-content"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Mis entregas
      </Link>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-h1 font-bold text-content">
            Pedido #{data.pedidoId}
          </h2>
          <SolicitudEstadoBadge estado={data.estado} />
        </div>

        <div className="flex flex-col gap-2 text-body text-content-secondary">
          <p className="inline-flex items-center gap-2">
            <Package size={16} aria-hidden="true" />
            {data.puntoDeVentaNombre}
          </p>
          <p className="inline-flex items-center gap-2">
            <MapPin size={16} aria-hidden="true" />
            Recoger en: {data.puntoDeVentaUbicacion}
          </p>
          {data.zonaEntrega && (
            <p className="inline-flex items-center gap-2">
              <Send size={16} aria-hidden="true" />
              Entregar en: {data.zonaEntrega}
            </p>
          )}
        </div>

        <Acciones
          solicitud={data}
          busy={accionBusy}
          onRecoger={confirmarRecogida}
          onEntregar={() => setEntregaOpen(true)}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold text-content">Seguimiento</h3>
        <ol className="flex flex-col gap-2 text-small">
          <Hito
            hecho={!!data.asignadoAt}
            label="Solicitud asignada"
            at={data.asignadoAt}
          />
          <Hito
            hecho={!!data.recogidoAt}
            label="Pedido recogido"
            at={data.recogidoAt}
          />
          <Hito
            hecho={!!data.entregadoAt}
            label="Pedido entregado"
            at={data.entregadoAt}
          />
        </ol>
      </Card>

      <ConfirmarEntregaModal
        open={entregaOpen}
        onClose={() => setEntregaOpen(false)}
        loading={accionBusy}
        onConfirm={confirmarEntrega}
      />
    </div>
  );
}

function Acciones({
  solicitud,
  busy,
  onRecoger,
  onEntregar,
}: {
  solicitud: SolicitudDeliveryResponse;
  busy: boolean;
  onRecoger: () => void;
  onEntregar: () => void;
}) {
  if (solicitud.estado === "ASIGNADO") {
    return (
      <div className="border-t border-line pt-4">
        <Button
          leftIcon={<Check size={16} />}
          loading={busy}
          onClick={onRecoger}
        >
          Confirmar recogida
        </Button>
      </div>
    );
  }
  if (solicitud.estado === "RECOGIDO") {
    return (
      <div className="border-t border-line pt-4">
        <Button leftIcon={<PackageCheck size={16} />} onClick={onEntregar}>
          Confirmar entrega
        </Button>
      </div>
    );
  }
  return null;
}

function Hito({
  hecho,
  label,
  at,
}: {
  hecho: boolean;
  label: string;
  at: string | null;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${hecho ? "bg-success-bg text-success-fg" : "bg-surface-muted text-content-muted"}`}
      >
        {hecho ? (
          <Check size={12} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      <span className={hecho ? "text-content" : "text-content-muted"}>
        {label}
      </span>
      {hecho && (
        <span className="ml-auto text-content-muted">{formatDateTime(at)}</span>
      )}
    </li>
  );
}
