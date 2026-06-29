import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { MotivoCancelacion, MotivoCancelacionRequest } from "@/types";

// Motivos que el comercio puede elegir al rechazar o cancelar (los de repartidor
// quedan fuera). OTRO exige detalle (10–200) — lo valida el backend (422).
const MOTIVOS_COMERCIO: { value: MotivoCancelacion; label: string }[] = [
  { value: "PRODUCTO_AGOTADO", label: "Producto agotado" },
  { value: "FALTA_INGREDIENTE", label: "Falta un ingrediente" },
  {
    value: "FUERA_DE_HORARIO_PRODUCTO",
    label: "Fuera de horario del producto",
  },
  { value: "LOCAL_SATURADO", label: "Local saturado" },
  { value: "LOCAL_POR_CERRAR", label: "Local por cerrar" },
  { value: "PROBLEMA_OPERATIVO", label: "Problema operativo" },
  { value: "OTRO", label: "Otro motivo" },
];

interface MotivoCancelacionModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  submitting?: boolean;
  onConfirm: (body: MotivoCancelacionRequest) => void;
}

/** Modal de motivo para rechazar/cancelar un pedido (comercio). */
export function MotivoCancelacionModal({
  open,
  onClose,
  title,
  confirmLabel,
  submitting,
  onConfirm,
}: MotivoCancelacionModalProps) {
  const [motivo, setMotivo] = useState<MotivoCancelacion>("PRODUCTO_AGOTADO");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    if (motivo === "OTRO" && detalle.trim().length < 10) {
      setError("Cuéntanos el motivo (al menos 10 caracteres).");
      return;
    }
    setError(null);
    onConfirm({ motivo, detalle: detalle.trim() || undefined });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            variant="destructive"
            loading={submitting}
            onClick={confirmar}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-small font-medium text-content-secondary">
            Motivo
          </legend>
          {MOTIVOS_COMERCIO.map((m) => (
            <label
              key={m.value}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-card border px-3 py-2.5 text-body",
                motivo === m.value
                  ? "border-brand bg-brand-soft text-content"
                  : "border-line text-content-secondary hover:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name="motivo"
                value={m.value}
                checked={motivo === m.value}
                onChange={() => setMotivo(m.value)}
                className="accent-brand"
              />
              {m.label}
            </label>
          ))}
        </fieldset>

        {motivo === "OTRO" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="detalle-motivo"
              className="text-small font-medium text-content-secondary"
            >
              Detalle
            </label>
            <textarea
              id="detalle-motivo"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={3}
              maxLength={200}
              className={cn(
                "w-full rounded-input border bg-surface px-3.5 py-2.5 text-body text-content",
                "placeholder:text-content-muted focus-visible:shadow-focus focus-visible:outline-none",
                error ? "border-error-dot" : "border-line",
              )}
              placeholder="Describe el motivo (10–200 caracteres)."
            />
            {error && <p className="text-small text-error-fg">{error}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
