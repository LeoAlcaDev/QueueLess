import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth';
import { Spinner } from '@/components/ui';
import type { Rol } from '@/types/enums';
import { paths } from './paths';

interface PrivateRouteProps {
  role?: Rol;
  children: ReactNode;
}

// Protege un arbol de rutas: exige sesion y, si se pide un rol, que el usuario lo tenga.
// El chequeo de rol aca es solo para la experiencia; quien manda es el backend con su 403.
export function PrivateRoute({ role, children }: PrivateRouteProps) {
  const { status, roles } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="grid h-screen place-items-center bg-page text-brand">
        <Spinner size={28} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  }

  if (role && !roles.includes(role)) {
    return <Navigate to={paths.landing} replace />;
  }

  return <>{children}</>;
}
