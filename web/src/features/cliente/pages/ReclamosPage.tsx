import { useState } from "react";
import { MessageSquareWarning, Plus, TriangleAlert } from "lucide-react";
import { reclamosApi } from "@/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Spinner,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { fieldErrorMap, isApiError, userFacingMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import {
  DESTINATARIOS_RECLAMO,
  TIPOS_RECLAMO,
  type DestinatarioReclamo,
  type TipoReclamo,
} from "@/types";
import { useFetch } from "@/hooks";

const TIPO_LABEL: Record<TipoReclamo, string> = {
  RECLAMO: "Reclamo",
  QUEJA: "Queja",
};
const CONTRA_LABEL: Record<DestinatarioReclamo, string> = {
  COMERCIO: "Un comercio",
  PLATAFORMA: "La plataforma",
};

/** Mis reclamos (GET /reclamos/mios) + crear reclamo (contra COMERCIO exige local). */
export default function ReclamosPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch(() =>
    reclamosApi.listMisReclamos(),
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3 font-semibold text-content">Mis reclamos</h2>
        <Button
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={() => setOpen(true)}
        >
          Nuevo
        </Button>
      </div>

      {loading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner size={22} />
        </div>
      ) : error ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar tus reclamos"
          description={userFacingMessage(error)}
          action={
            <Button variant="secondary" size="sm" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="No tienes reclamos"
          description="Si algo salió mal con un pedido, puedes registrar un reclamo o queja."
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              Crear reclamo
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data!.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body font-semibold text-content">
                  {r.codigoConstancia}
                </span>
                <Badge tone="neutral">{TIPO_LABEL[r.tipo]}</Badge>
                <Badge tone={r.estado === "RESPONDIDO" ? "success" : "warning"}>
                  {r.estado === "RESPONDIDO" ? "Respondido" : "Pendiente"}
                </Badge>
              </div>
              <p className="text-small text-content-secondary">{r.detalle}</p>
              {r.respuesta && (
                <div className="rounded-card bg-surface-muted p-3">
                  <p className="text-small font-medium text-content">
                    Respuesta
                  </p>
                  <p className="text-small text-content-secondary">
                    {r.respuesta}
                  </p>
                </div>
              )}
              <p className="text-badge text-content-muted">
                {formatDateTime(r.creadoAt)}
              </p>
            </Card>
          ))}
        </div>
      )}

      <NuevoReclamoModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(codigo) => {
          toast.success(`Reclamo registrado. Constancia ${codigo}.`);
          setOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

function NuevoReclamoModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (codigo: string) => void;
}) {
  const toast = useToast();
  const [tipo, setTipo] = useState<TipoReclamo>("RECLAMO");
  const [contra, setContra] = useState<DestinatarioReclamo>("COMERCIO");
  const [puntoDeVentaId, setPuntoDeVentaId] = useState("");
  const [pedidoId, setPedidoId] = useState("");
  const [detalle, setDetalle] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function enviar() {
    setFieldErrors({});
    if (!detalle.trim()) {
      setFieldErrors({ detalle: "Cuentanos qué pasó." });
      return;
    }
    if (contra === "COMERCIO" && !puntoDeVentaId.trim()) {
      setFieldErrors({ puntoDeVentaId: "Indicá el local del reclamo." });
      return;
    }
    setSubmitting(true);
    try {
      const acuse = await reclamosApi.crearReclamo({
        tipo,
        contra,
        puntoDeVentaId:
          contra === "COMERCIO" ? Number(puntoDeVentaId) : undefined,
        pedidoId: pedidoId ? Number(pedidoId) : undefined,
        detalle: detalle.trim(),
      });
      onCreated(acuse.codigoConstancia);
      setDetalle("");
      setPuntoDeVentaId("");
      setPedidoId("");
    } catch (err) {
      if (isApiError(err) && err.status === 400)
        setFieldErrors(fieldErrorMap(err));
      else toast.error(userFacingMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo reclamo"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={submitting} onClick={enviar}>
            Registrar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          label="Tipo"
          options={TIPOS_RECLAMO}
          value={tipo}
          onChange={setTipo}
          labelFor={(t) => TIPO_LABEL[t]}
        />
        <Segmented
          label="¿Contra quién?"
          options={DESTINATARIOS_RECLAMO}
          value={contra}
          onChange={setContra}
          labelFor={(c) => CONTRA_LABEL[c]}
        />
        {contra === "COMERCIO" && (
          <Input
            label="ID del local"
            type="number"
            inputMode="numeric"
            value={puntoDeVentaId}
            onChange={(e) => setPuntoDeVentaId(e.target.value)}
            error={fieldErrors.puntoDeVentaId}
          />
        )}
        <Input
          label="ID del pedido (opcional)"
          type="number"
          inputMode="numeric"
          value={pedidoId}
          onChange={(e) => setPedidoId(e.target.value)}
          error={fieldErrors.pedidoId}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="detalle"
            className="text-small font-medium text-content-secondary"
          >
            Detalle
          </label>
          <textarea
            id="detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={4}
            className={cn(
              "w-full rounded-input border bg-surface px-3.5 py-2.5 text-body text-content",
              "placeholder:text-content-muted focus-visible:shadow-focus focus-visible:outline-none",
              fieldErrors.detalle ? "border-error-dot" : "border-line",
            )}
            placeholder="Describe lo que pasó."
          />
          {fieldErrors.detalle && (
            <p className="text-small text-error-fg">{fieldErrors.detalle}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  labelFor,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelFor: (v: T) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-small font-medium text-content-secondary">
        {label}
      </span>
      <div className="flex gap-1 rounded-pill bg-surface-muted p-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className={cn(
              "flex-1 rounded-pill px-3 py-1.5 text-small font-semibold focus-visible:shadow-focus focus-visible:outline-none",
              value === opt
                ? "bg-surface text-content-brand shadow-sm"
                : "text-content-secondary hover:text-content",
            )}
          >
            {labelFor(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}
