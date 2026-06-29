import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";

export interface WaitTimeBadgeProps {
  /** Minutos estimados de espera. */
  minutes: number;
  /** Antepone ≈ al tiempo (estimado). */
  approx?: boolean;
  className?: string;
}

// Umbral de color: <5 verde, 5–15 ámbar, >15 rojo.
const TIERS = {
  fast: "bg-success-bg text-success-fg",
  mid: "bg-warning-bg text-warning-fg",
  slow: "bg-error-bg text-error-fg",
};

/** Tiempo de espera con color por umbral. Lleva ícono + texto (no solo color). */
export function WaitTimeBadge({
  minutes,
  approx = true,
  className,
}: WaitTimeBadgeProps) {
  const tier = minutes < 5 ? "fast" : minutes <= 15 ? "mid" : "slow";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-badge font-semibold leading-none",
        TIERS[tier],
        className,
      )}
    >
      <Clock size={12} aria-hidden="true" />
      {approx ? "≈ " : ""}
      {minutes} min
    </span>
  );
}
