import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Acción opcional (normalmente un Button). */
  action?: ReactNode;
  className?: string;
}

/** Estado vacío con copy útil + acción (Design content fundamentals). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-pill bg-surface-muted text-content-secondary">
          <Icon size={24} aria-hidden="true" />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-h3 font-semibold text-content">{title}</h3>
        {description && (
          <p className="text-small text-content-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
