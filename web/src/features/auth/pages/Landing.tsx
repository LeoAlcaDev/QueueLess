import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Button, Icon, Spinner } from '@/components/ui';
import { paths } from '@/routes/paths';
import { AuthLayout } from '../components/AuthLayout';

export default function Landing() {
  const { status, activeRole } = useAuth();
  const navigate = useNavigate();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-page text-brand">
        <Spinner size={28} />
      </div>
    );
  }

  // con sesión activa no mostramos la landing: directo al panel del rol (o a la cuenta si por
  // algún motivo no hay rol activo todavía)
  if (status === 'authenticated') {
    return <Navigate to={activeRole ? paths.home(activeRole) : paths.cuenta} replace />;
  }

  return (
    <AuthLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink">Bienvenido</h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            Ingresa o crea tu cuenta para empezar a pedir.
          </p>
        </div>

        <Button full onClick={() => navigate(paths.login)}>
          Ingresar
        </Button>
        <Button full variant="secondary" onClick={() => navigate(paths.register)}>
          Crear cuenta
        </Button>

        <button
          type="button"
          onClick={() => navigate(paths.explorar)}
          className="inline-flex items-center gap-1 self-start px-1.5 py-1.5 text-small font-semibold text-brand-text hover:underline"
        >
          Explorar locales sin iniciar sesión
          <Icon name="arrowRight" size={15} />
        </button>
      </div>
    </AuthLayout>
  );
}
