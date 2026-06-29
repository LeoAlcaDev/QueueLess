import { useState } from "react";
import { Star, Truck } from "lucide-react";
import { perfilesApi } from "@/api";
import { Button, Card, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { userFacingMessage } from "@/lib/errors";
import type { PerfilRepartidorResponse } from "@/types";

/**
 * Edición del perfil de repartidor (PUT /me/perfiles/repartidor). Solo el
 * toggle `disponible`; calificación y entregas son de solo lectura.
 */
export function RepartidorProfileForm({
  perfil,
}: {
  perfil: PerfilRepartidorResponse;
}) {
  const toast = useToast();
  const [disponible, setDisponible] = useState(perfil.disponible ?? false);
  const [submitting, setSubmitting] = useState(false);

  async function guardar() {
    setSubmitting(true);
    try {
      await perfilesApi.updatePerfilRepartidor({ disponible });
      toast.success(
        disponible
          ? "Estás disponible para entregas."
          : "Quedaste no disponible.",
      );
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-h3 font-semibold text-content">Repartidor</h3>

      <div className="flex flex-wrap gap-4 text-small text-content-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Star size={15} aria-hidden="true" />
          {perfil.calificacionPromedio != null
            ? `${perfil.calificacionPromedio.toFixed(1)} de calificación`
            : "Sin calificación aún"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Truck size={15} aria-hidden="true" />
          {perfil.totalEntregas ?? 0} entregas
        </span>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-body font-semibold text-content">
            Disponible para entregas
          </span>
          <span className="text-small text-content-secondary">
            Mientras esté activo te aparecerán solicitudes cercanas.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={disponible}
          onClick={() => setDisponible((v) => !v)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-pill transition-colors focus-visible:shadow-focus focus-visible:outline-none",
            disponible
              ? "bg-brand-strong"
              : "bg-surface-muted border border-line",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform",
              disponible ? "translate-x-[22px]" : "translate-x-0.5",
            )}
            aria-hidden="true"
          />
        </button>
      </label>

      <Button loading={submitting} onClick={guardar} className="self-start">
        Guardar cambios
      </Button>
    </Card>
  );
}
