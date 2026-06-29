import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { areasForRoles, type AreaNav } from "@/app/navigation";
import type { Rol } from "@/types";

interface RoleSwitcherProps {
  roles: Rol[];
  /** Área activa (para resaltar). */
  active: AreaNav | null;
  className?: string;
}

/**
 * Conmutador de rol activo: navega a la home de cada área que el usuario tiene
 * (el área activa se deriva de la ruta, no hay estado extra). Se oculta solo si
 * el usuario tiene una única área.
 */
export function RoleSwitcher({ roles, active, className }: RoleSwitcherProps) {
  const areas = areasForRoles(roles);
  if (areas.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Cambiar de rol"
      className={cn("flex gap-1 rounded-pill bg-surface-muted p-1", className)}
    >
      {areas.map((area) => {
        const Icon = area.icon;
        const isActive = active?.key === area.key;
        return (
          <NavLink
            key={area.key}
            to={area.basePath}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-pill px-3 py-1.5 text-small font-semibold",
              "focus-visible:shadow-focus focus-visible:outline-none",
              isActive
                ? "bg-surface text-content-brand shadow-sm"
                : "text-content-secondary hover:text-content",
            )}
          >
            <Icon size={15} aria-hidden="true" />
            {area.label}
          </NavLink>
        );
      })}
    </div>
  );
}
