import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/auth";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/ThemeContext";

/**
 * Chrome del catálogo público (sin sesión). Si el usuario está autenticado,
 * redirige a la versión in-shell (/cliente…) para conservar la navegación por rol.
 */
export default function PublicCatalogLayout() {
  const { status } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <Spinner size={28} />
      </div>
    );
  }

  if (status === "authenticated") {
    const target =
      pathname === "/locales"
        ? "/cliente"
        : pathname.replace(/^\/locales/, "/cliente/locales");
    return <Navigate to={target} replace />;
  }

  return (
    <div className="min-h-screen bg-page text-content">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/queueless-mark.svg" alt="" className="h-7 w-7" />
          <span className="text-h3 font-bold">QueueLess</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"
            }
            className={cn(
              "grid h-9 w-9 place-items-center rounded-pill text-content-secondary",
              "hover:bg-surface-muted focus-visible:shadow-focus focus-visible:outline-none",
            )}
          >
            {theme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>
          <Link to="/auth/login">
            <Button size="sm">Iniciar sesión</Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
