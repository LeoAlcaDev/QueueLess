import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  "success" | "warning" | "error" | "info" | "brand" | "neutral" | "points";

export interface BadgeProps {
  tone?: BadgeTone;
  /** Muestra el punto de color antes del texto (estado nunca solo por color). */
  dot?: boolean;
  /** Reemplaza el punto por un ícono propio. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const TONES: Record<BadgeTone, { wrap: string; dot: string }> = {
  success: { wrap: "bg-success-bg text-success-fg", dot: "bg-success-dot" },
  warning: { wrap: "bg-warning-bg text-warning-fg", dot: "bg-warning-dot" },
  error: { wrap: "bg-error-bg text-error-fg", dot: "bg-error-dot" },
  info: { wrap: "bg-info-bg text-info-fg", dot: "bg-info-dot" },
  brand: { wrap: "bg-brand-soft text-content-brand", dot: "bg-brand" },
  neutral: { wrap: "bg-neutral-bg text-neutral-fg", dot: "bg-neutral-dot" },
  points: { wrap: "bg-points-soft text-points-strong", dot: "bg-points" },
};

/** Píldora genérica. Para estados de pedido usar OrderStatusBadge. */
export function Badge({
  tone = "neutral",
  dot = true,
  icon,
  children,
  className,
}: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-badge font-semibold leading-none",
        t.wrap,
        className,
      )}
    >
      {icon ??
        (dot && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full", t.dot)}
            aria-hidden="true"
          />
        ))}
      {children}
    </span>
  );
}
