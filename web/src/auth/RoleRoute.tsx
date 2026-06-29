import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui";
import type { Rol } from "@/types";
import { useAuth } from "./AuthContext";

interface RoleRouteProps {
  /** Rol exigido para entrar al área. */
  rol: Rol;
  children?: ReactNode;
  /** A dónde mandar si no tiene el rol (p. ej. a activar-rol / mi cuenta). */
  fallbackTo?: string;
}

/**
 * Exige un rol concreto. Asume sesión iniciada (anidar bajo ProtectedRoute).
 * Si el usuario no tiene el rol, redirige; la activación del rol (que además
 * refresca el token) la dispara la pantalla de cuenta vía useAuth().activarRol.
 */
export function RoleRoute({
  rol,
  children,
  fallbackTo = "/cuenta",
}: RoleRouteProps) {
  const { status, hasRole } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <Spinner size={28} />
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  if (!hasRole(rol)) {
    return <Navigate to={fallbackTo} replace state={{ requiredRole: rol }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
