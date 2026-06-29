import { NavLink } from "react-router-dom";
import { LogOut, Moon, Sun, UserCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/ThemeContext";
import { RoleSwitcher } from "./RoleSwitcher";
import type { AreaNav } from "@/app/navigation";
import type { Rol } from "@/types";

interface SidebarProps {
  area: AreaNav | null;
  roles: Rol[];
  onLogout: () => void;
}

const linkBase =
  "flex items-center gap-3 rounded-button px-3 py-2.5 text-body font-medium focus-visible:shadow-focus focus-visible:outline-none";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    linkBase,
    isActive
      ? "bg-brand-soft text-content-brand"
      : "text-content-secondary hover:bg-surface-muted hover:text-content",
  );
}

/** Barra lateral de escritorio (≥ lg, 240 px). En móvil se reemplaza por BottomNav. */
export function Sidebar({ area, roles, onLogout }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-4 border-r border-line bg-surface px-3 py-4 lg:flex">
      <NavLink to="/" className="flex items-center gap-2 px-2 py-1">
        <img src="/queueless-mark.svg" alt="" className="h-7 w-7" />
        <span className="text-h3 font-bold text-content">QueueLess</span>
      </NavLink>

      <RoleSwitcher roles={roles} active={area} />

      <nav className="flex flex-1 flex-col gap-1">
        {area?.items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
            >
              <Icon size={20} aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-line pt-3">
        <NavLink to="/cuenta" className={navLinkClass}>
          <UserCircle size={20} aria-hidden="true" />
          Mi cuenta
        </NavLink>
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            linkBase,
            "text-content-secondary hover:bg-surface-muted hover:text-content",
          )}
        >
          {theme === "dark" ? (
            <Sun size={20} aria-hidden="true" />
          ) : (
            <Moon size={20} aria-hidden="true" />
          )}
          {theme === "dark" ? "Tema claro" : "Tema oscuro"}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            linkBase,
            "text-content-secondary hover:bg-surface-muted hover:text-content",
          )}
        >
          <LogOut size={20} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
