import { useState, type FormEvent } from "react";
import { perfilesApi } from "@/api";
import { Button, Card, Input, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fieldErrorMap, isApiError, userFacingMessage } from "@/lib/errors";
import { humanizeEnum } from "@/lib/labels";
import {
  ALERGENOS,
  RESTRICCIONES_DIETETICAS,
  TOLERANCIAS_PICANTE,
  type Alergeno,
  type PerfilClienteResponse,
  type RestriccionDietetica,
  type ToleranciaPicante,
} from "@/types";
import { ChipMultiSelect } from "./ChipMultiSelect";

/** Edición del perfil de cliente (PUT /me/perfiles/cliente). Campos opcionales. */
export function ClienteProfileForm({
  perfil,
}: {
  perfil: PerfilClienteResponse;
}) {
  const toast = useToast();
  const [direccion, setDireccion] = useState(perfil.direccionPreferida ?? "");
  const [alergias, setAlergias] = useState(perfil.alergias ?? "");
  const [alergenos, setAlergenos] = useState<Alergeno[]>(
    perfil.alergenosEvitar ?? [],
  );
  const [restricciones, setRestricciones] = useState<RestriccionDietetica[]>(
    perfil.restriccionesDieteticas ?? [],
  );
  const [tolerancia, setTolerancia] = useState<ToleranciaPicante | "">(
    perfil.toleranciaPicante ?? "",
  );
  const [presupuesto, setPresupuesto] = useState(
    perfil.presupuestoReferencia != null
      ? String(perfil.presupuestoReferencia)
      : "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      await perfilesApi.updatePerfilCliente({
        direccionPreferida: direccion.trim() || undefined,
        alergias: alergias.trim() || undefined,
        alergenosEvitar: alergenos.length ? alergenos : undefined,
        restriccionesDieteticas: restricciones.length
          ? restricciones
          : undefined,
        toleranciaPicante: tolerancia || undefined,
        presupuestoReferencia: presupuesto ? Number(presupuesto) : undefined,
      });
      toast.success("Perfil de cliente actualizado.");
    } catch (err) {
      if (isApiError(err) && err.status === 400)
        setFieldErrors(fieldErrorMap(err));
      else toast.error(userFacingMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-h3 font-semibold text-content">Cliente</h3>
        {perfil.totalPedidos != null && (
          <span className="text-small text-content-muted">
            {perfil.totalPedidos} pedidos
          </span>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Dirección preferida"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          error={fieldErrors.direccionPreferida}
        />
        <Input
          label="Alergias (texto libre)"
          value={alergias}
          onChange={(e) => setAlergias(e.target.value)}
          error={fieldErrors.alergias}
        />
        <ChipMultiSelect
          label="Alérgenos a evitar"
          options={ALERGENOS}
          value={alergenos}
          onChange={setAlergenos}
          labelFor={humanizeEnum}
        />
        <ChipMultiSelect
          label="Restricciones dietéticas"
          options={RESTRICCIONES_DIETETICAS}
          value={restricciones}
          onChange={setRestricciones}
          labelFor={humanizeEnum}
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tolerancia"
            className="text-small font-medium text-content-secondary"
          >
            Tolerancia al picante
          </label>
          <select
            id="tolerancia"
            value={tolerancia}
            onChange={(e) =>
              setTolerancia(e.target.value as ToleranciaPicante | "")
            }
            className={cn(
              "h-12 w-full rounded-input border border-line bg-surface px-3.5 text-body text-content",
              "focus-visible:shadow-focus focus-visible:outline-none",
            )}
          >
            <option value="">Sin preferencia</option>
            {TOLERANCIAS_PICANTE.map((t) => (
              <option key={t} value={t}>
                {humanizeEnum(t)}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Presupuesto de referencia (S/)"
          type="number"
          min={0}
          step="0.5"
          inputMode="decimal"
          value={presupuesto}
          onChange={(e) => setPresupuesto(e.target.value)}
          error={fieldErrors.presupuestoReferencia}
        />
        <Button type="submit" loading={submitting} className="self-start">
          Guardar cambios
        </Button>
      </form>
    </Card>
  );
}
