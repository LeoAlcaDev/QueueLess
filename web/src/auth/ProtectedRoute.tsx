import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  /** Si se usa como wrapper en vez de layout route. */
  children?: ReactNode;
  /** A dónde mandar si no hay sesión. */
  redirectTo?: string;
}

/** Exige sesión iniciada. Mientras valida el token muestra un spinner. */
export function ProtectedRoute({
  children,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <Spinner size={28} />
      </div>
    );
  }

  if (status === "anonymous") {
    // Recordar a dónde quería ir para volver tras el login.
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
