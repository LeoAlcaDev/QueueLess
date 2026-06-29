import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, Check } from "lucide-react";
import { useAuth } from "@/auth";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { fieldErrorMap, isApiError, userFacingMessage } from "@/lib/errors";
import { ROLES, type Rol } from "@/types";
import { AuthLayout } from "../components/AuthLayout";

const ROLE_INFO: Record<Rol, { label: string; description: string }> = {
  CLIENTE: { label: "Cliente", description: "Pide y segue tus pedidos." },
  COMERCIO: { label: "Comercio", description: "Gestiona tu local y la cola." },
  REPARTIDOR: { label: "Repartidor", description: "Reparte pedidos." },
};

/**
 * Registro (POST /api/auth/register) con selector multi-rol.
 * 409 → "correo en uso" inline en email; 400 → fieldErrors bajo cada campo.
 */
export default function RegisterPage() {
  const { status, register } = useAuth();
  const navigate = useNavigate();

  const [nombreCompleto, setNombreCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<Rol[]>(["CLIENTE"]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") return <Navigate to="/" replace />;

  function toggleRol(rol: Rol) {
    setRoles((prev) =>
      prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    if (roles.length === 0) {
      setFormError("Elige al menos un rol para empezar.");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        nombreCompleto: nombreCompleto.trim(),
        email: email.trim(),
        password,
        roles,
      });
      navigate("/", { replace: true });
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        // Correo ya registrado → inline en el campo email (MAPA §7.1).
        setFieldErrors({ email: err.message || "Este correo ya está en uso." });
      } else if (isApiError(err) && err.status === 400) {
        const map = fieldErrorMap(err);
        setFieldErrors(map);
        if (!Object.keys(map).length) setFormError(userFacingMessage(err));
      } else {
        setFormError(userFacingMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Unos datos y listo para pedir."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link to="/auth/login" className="font-semibold text-content-brand">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-card border border-error-dot bg-error-bg p-3 text-small text-error-fg"
          >
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{formError}</span>
          </div>
        )}
        <Input
          label="Nombre completo"
          autoComplete="name"
          required
          value={nombreCompleto}
          onChange={(e) => setNombreCompleto(e.target.value)}
          error={fieldErrors.nombreCompleto}
        />
        <Input
          label="Correo"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Mínimo 8 caracteres."
          error={fieldErrors.password}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-small font-medium text-content-secondary">
            ¿Cómo vas a usar QueueLess?
          </legend>
          {ROLES.map((rol) => {
            const info = ROLE_INFO[rol];
            const checked = roles.includes(rol);
            return (
              <label
                key={rol}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-colors",
                  checked
                    ? "border-brand bg-brand-soft"
                    : "border-line hover:bg-surface-muted",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleRol(rol)}
                />
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border",
                    checked
                      ? "border-brand-strong bg-brand-strong text-onbrand"
                      : "border-line",
                  )}
                  aria-hidden="true"
                >
                  {checked && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="flex flex-col">
                  <span className="text-body font-semibold text-content">
                    {info.label}
                  </span>
                  <span className="text-small text-content-secondary">
                    {info.description}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <Button type="submit" full loading={submitting}>
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>
    </AuthLayout>
  );
}
