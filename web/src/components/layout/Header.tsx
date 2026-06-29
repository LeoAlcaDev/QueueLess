import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/ThemeContext";
import { RoleSwitcher } from "./RoleSwitcher";
import type { AreaNav } from "@/app/navigation";
import type { Rol } from "@/types";

interface HeaderProps {
  area: AreaNav | null;
  roles: Rol[];
  /** Acción contextual a la derecha del título (opcional). */
  action?: ReactNode;
}

/** Título de la página a partir de la ruta actual y el nav del área. */
function pageTitle(pathname: string, area: AreaNav | null): string {
  if (pathname === "/cuenta") return "Mi cuenta";
  if (pathname.startsWith("/cuenta/perfil")) return "Mis perfiles";
  const item = area?.items.find((i) =>
    i.end
      ? pathname === i.to
      : pathname === i.to || pathname.startsWith(`${i.to}/`),
  );
  return item?.label ?? area?.label ?? "QueueLess";
}

/** Cabecera sticky: marca (móvil) + título + acción + conmutadores. */
export function Header({ area, roles, action }: HeaderProps) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const title = pageTitle(pathname, area);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
      <img src="/queueless-mark.svg" alt="" className="h-7 w-7 lg:hidden" />
      <h1 className="flex-1 truncate text-h3 font-bold text-content">
        {title}
      </h1>

      {/* El conmutador de rol va en la Sidebar en escritorio; en móvil, aquí. */}
      <div className="hidden min-[480px]:block lg:hidden">
        <RoleSwitcher roles={roles} active={area} />
      </div>

      {action}

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={
          theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"
        }
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-pill text-content-secondary",
          "hover:bg-surface-muted focus-visible:shadow-focus focus-visible:outline-none",
        )}
      >
        {theme === "dark" ? (
          <Sun size={18} aria-hidden="true" />
        ) : (
          <Moon size={18} aria-hidden="true" />
        )}
      </button>
    </header>
  );
}
