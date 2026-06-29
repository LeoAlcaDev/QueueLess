import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/auth";
import { Button, Input, Spinner } from "@/components/ui";
import { fieldErrorMap, isApiError, userFacingMessage } from "@/lib/errors";
import { AuthLayout } from "../components/AuthLayout";

interface FromState {
  from?: { pathname?: string };
}

/** Inicio de sesión (POST /api/auth/login). 401 → error en el formulario. */
export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as FromState | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión (p. ej. se navegó a /auth/login a mano), salir del formulario.
  if (status === "authenticated") return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      if (isApiError(err) && err.status === 400) {
        setFieldErrors(fieldErrorMap(err));
        if (!err.fieldErrors?.length) setFormError(userFacingMessage(err));
      } else {
        // 401 (credenciales) y el resto: banner del formulario.
        setFormError(userFacingMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Ingresa con tu correo y contraseña."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link
            to="/auth/register"
            className="font-semibold text-content-brand"
          >
            Crear cuenta
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Button type="submit" full loading={submitting}>
          {submitting ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </form>
      {status === "loading" && (
        <div className="mt-4 flex justify-center">
          <Spinner size={18} />
        </div>
      )}
    </AuthLayout>
  );
}
