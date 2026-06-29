import { NavLink } from "react-router-dom";
import { UserCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AreaNav } from "@/app/navigation";

interface BottomNavProps {
  area: AreaNav | null;
}

function tabClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex flex-col items-center justify-center gap-1 rounded-button py-1.5 text-badge font-semibold",
    "focus-visible:shadow-focus focus-visible:outline-none",
    isActive
      ? "text-content-brand"
      : "text-content-muted hover:text-content-secondary",
  );
}

/**
 * Navegación inferior de móvil (< lg). Muestra los tabs del área activa más un
 * acceso a la cuenta. En escritorio se reemplaza por la Sidebar.
 */
export function BottomNav({ area }: BottomNavProps) {
  const items = area?.items ?? [];
  // +1 columna para el tab de cuenta.
  const cols = items.length + 1;

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-30 grid border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={tabClass}
          >
            <Icon size={22} aria-hidden="true" />
            {item.label}
          </NavLink>
        );
      })}
      <NavLink to="/cuenta" className={tabClass}>
        <UserCircle size={22} aria-hidden="true" />
        Cuenta
      </NavLink>
    </nav>
  );
}
