import { useState, type FormEvent } from "react";
import { perfilesApi } from "@/api";
import { Button, Card, Input, useToast } from "@/components/ui";
import { fieldErrorMap, isApiError, userFacingMessage } from "@/lib/errors";
import type { PerfilComercioResponse } from "@/types";

/**
 * Edición del perfil de comercio (PUT /me/perfiles/comercio). RUC obligatorio
 * (11 dígitos, 10/20). La tasa de cumplimiento es de solo lectura (ADR-0026).
 */
export function ComercioProfileForm({
  perfil,
}: {
  perfil: PerfilComercioResponse;
}) {
  const toast = useToast();
  const [ruc, setRuc] = useState(perfil.ruc ?? "");
  const [telefono, setTelefono] = useState(perfil.contactoTelefono ?? "");
  const [contactoEmail, setContactoEmail] = useState(
    perfil.contactoEmail ?? "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      await perfilesApi.updatePerfilComercio({
        ruc: ruc.trim(),
        contactoTelefono: telefono.trim() || undefined,
        contactoEmail: contactoEmail.trim() || undefined,
      });
      toast.success("Perfil de comercio actualizado.");
    } catch (err) {
      if (isApiError(err) && err.status === 400)
        setFieldErrors(fieldErrorMap(err));
      else toast.error(userFacingMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const tasa = perfil.tasaCumplimiento;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-h3 font-semibold text-content">Comercio</h3>
        <span className="text-small text-content-muted">
          {tasa != null
            ? `Cumplimiento: ${Math.round(tasa * 100)}%`
            : "Cumplimiento: sin datos"}
        </span>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="RUC"
          required
          inputMode="numeric"
          maxLength={11}
          placeholder="20123456789"
          value={ruc}
          onChange={(e) => setRuc(e.target.value)}
          hint="11 dígitos, empieza con 10 o 20."
          error={fieldErrors.ruc}
        />
        <Input
          label="Teléfono de contacto"
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          error={fieldErrors.contactoTelefono}
        />
        <Input
          label="Correo de contacto"
          type="email"
          value={contactoEmail}
          onChange={(e) => setContactoEmail(e.target.value)}
          error={fieldErrors.contactoEmail}
        />
        <Button type="submit" loading={submitting} className="self-start">
          Guardar cambios
        </Button>
      </form>
    </Card>
  );
}
