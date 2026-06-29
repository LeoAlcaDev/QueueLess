import { useState } from "react";
import { Inbox, MessageSquareReply, TriangleAlert } from "lucide-react";
import { reclamosApi } from "@/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Spinner,
  useToast,
} from "@/components/ui";
import { useFetch } from "@/hooks";
import { isApiError, userFacingMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ReclamoResponse, TipoReclamo } from "@/types";

const TIPO_LABEL: Record<TipoReclamo, string> = {
  RECLAMO: "Reclamo",
  QUEJA: "Queja",
};

/** Reclamos recibidos por el comercio (GET /comercio/reclamos) + responder. */
export default function ReclamosComercioPage() {
  const { data, loading, error, refetch } = useFetch(() =>
    reclamosApi.listReclamosComercio(),
  );
  const [responder, setResponder] = useState<ReclamoResponse | null>(null);

  const pendientes = (data ?? []).filter(
    (r) => r.estado === "PENDIENTE",
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-h1 font-bold text-content">Reclamos recibidos</h2>
        {pendientes > 0 && (
          <Badge tone="warning">{pendientes} sin responder</Badge>
        )}
      </header>

      {loading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner size={22} />
        </div>
      ) : error ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar los reclamos"
          description={userFacingMessage(error)}
          action={
            <Button variant="secondary" size="sm" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No tienes reclamos"
          description="Cuando un cliente registre un reclamo contra tu local, aparecerá aquí."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data!.map((r) => {
            const respondido = r.estado === "RESPONDIDO";
            return (
              <Card key={r.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-semibold text-content">
                    {r.codigoConstancia}
                  </span>
                  <Badge tone="neutral">{TIPO_LABEL[r.tipo]}</Badge>
                  <Badge tone={respondido ? "success" : "warning"}>
                    {respondido ? "Respondido" : "Pendiente"}
                  </Badge>
                </div>
                <p className="text-small text-content-secondary">{r.detalle}</p>
                {r.respuesta && (
                  <div className="rounded-card bg-surface-muted p-3">
                    <p className="text-small font-medium text-content">
                      Tu respuesta
                    </p>
                    <p className="text-small text-content-secondary">
                      {r.respuesta}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-badge text-content-muted">
                    {formatDateTime(r.creadoAt)}
                  </span>
                  {!respondido && (
                    <Button
                      size="sm"
                      leftIcon={<MessageSquareReply size={16} />}
                      onClick={() => setResponder(r)}
                    >
                      Responder
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {responder && (
        <ResponderModal
          reclamo={responder}
          onClose={() => setResponder(null)}
          onResponded={() => {
            setResponder(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function ResponderModal({
  reclamo,
  onClose,
  onResponded,
}: {
  reclamo: ReclamoResponse;
  onClose: () => void;
  onResponded: () => void;
}) {
  const toast = useToast();
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function enviar() {
    if (respuesta.trim().length < 10) {
      setError("La respuesta debe tener al menos 10 caracteres.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await reclamosApi.responderReclamo(reclamo.id, {
        respuesta: respuesta.trim(),
      });
      toast.success("Respuesta enviada.");
      onResponded();
    } catch (err) {
      // 422 si el reclamo ya fue respondido (carrera): mostramos el mensaje y refrescamos.
      if (isApiError(err) && err.status === 422) {
        toast.error(userFacingMessage(err));
        onResponded();
      } else {
        toast.error(userFacingMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Responder ${reclamo.codigoConstancia}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={submitting} onClick={enviar}>
            Enviar respuesta
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-card bg-surface-muted p-3">
          <p className="text-small text-content-secondary">{reclamo.detalle}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="respuesta"
            className="text-small font-medium text-content-secondary"
          >
            Tu respuesta
          </label>
          <textarea
            id="respuesta"
            value={respuesta}
            onChange={(e) => {
              setRespuesta(e.target.value);
              if (error) setError(null);
            }}
            rows={4}
            className={cn(
              "w-full rounded-input border bg-surface px-3.5 py-2.5 text-body text-content",
              "placeholder:text-content-muted focus-visible:shadow-focus focus-visible:outline-none",
              error ? "border-error-dot" : "border-line",
            )}
            placeholder="Explica cómo resolverás el reclamo."
          />
          {error && <p className="text-small text-error-fg">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}
