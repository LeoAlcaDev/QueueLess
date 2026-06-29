import { useState, type FormEvent } from "react";
import { localesApi } from "@/api";
import { Button, Input, Modal, useToast } from "@/components/ui";
import { fieldErrorMap, isApiError, userFacingMessage } from "@/lib/errors";
import type { CrearPuntoDeVentaRequest, PuntoDeVentaResponse } from "@/types";

interface LocalFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Si viene, es edición; si no, alta. */
  local?: PuntoDeVentaResponse | null;
  onSaved: () => void;
}

/** Alta/edición de un local (POST/PUT /comercio/puntos-de-venta). */
export function LocalFormModal({
  open,
  onClose,
  local,
  onSaved,
}: LocalFormModalProps) {
  const toast = useToast();
  const editando = !!local;
  const [nombre, setNombre] = useState(local?.nombre ?? "");
  const [ubicacion, setUbicacion] = useState(local?.ubicacion ?? "");
  const [apertura, setApertura] = useState(
    (local?.horarioApertura ?? "").slice(0, 5),
  );
  const [cierre, setCierre] = useState(
    (local?.horarioCierre ?? "").slice(0, 5),
  );
  const [tiempo, setTiempo] = useState(
    local?.tiempoEsperaEstimado != null
      ? String(local.tiempoEsperaEstimado)
      : "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    if (!nombre.trim() || !ubicacion.trim()) {
      setFieldErrors({
        ...(nombre.trim() ? {} : { nombre: "Ingresa el nombre del local." }),
        ...(ubicacion.trim() ? {} : { ubicacion: "Ingresa la ubicación." }),
      });
      return;
    }
    const body: CrearPuntoDeVentaRequest = {
      nombre: nombre.trim(),
      ubicacion: ubicacion.trim(),
      horarioApertura: apertura || undefined,
      horarioCierre: cierre || undefined,
      tiempoPromedioDeclarado: tiempo ? Number(tiempo) : undefined,
    };
    setSubmitting(true);
    try {
      if (local) await localesApi.updateLocal(local.id, body);
      else await localesApi.crearLocal(body);
      toast.success(editando ? "Local actualizado." : "Local creado.");
      onSaved();
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
      title={editando ? "Editar local" : "Nuevo local"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="local-form" loading={submitting}>
            {editando ? "Guardar cambios" : "Crear local"}
          </Button>
        </div>
      }
    >
      <form id="local-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Nombre"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={fieldErrors.nombre}
        />
        <Input
          label="Ubicación"
          required
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          error={fieldErrors.ubicacion}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Apertura"
            type="time"
            value={apertura}
            onChange={(e) => setApertura(e.target.value)}
            error={fieldErrors.horarioApertura}
          />
          <Input
            label="Cierre"
            type="time"
            value={cierre}
            onChange={(e) => setCierre(e.target.value)}
            error={fieldErrors.horarioCierre}
          />
        </div>
        <Input
          label="Tiempo de espera declarado (min)"
          type="number"
          inputMode="numeric"
          min={0}
          value={tiempo}
          onChange={(e) => setTiempo(e.target.value)}
          error={fieldErrors.tiempoPromedioDeclarado}
          hint="Opcional. Estimación que verá el cliente."
        />
      </form>
    </Modal>
  );
}
