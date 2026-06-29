import { Zap } from "lucide-react";
import { cn } from "@/lib/cn";

export interface QueuePointsBadgeProps {
  amount: number;
  /** Prefijo del monto (p. ej. '+' para ganados). */
  prefix?: string;
  /** sm = píldora compacta · lg = texto grande para hero de puntos. */
  size?: "sm" | "lg";
  className?: string;
}

/** Indicador de QueuePoints. Morado exclusivo del flujo de puntos. */
export function QueuePointsBadge({
  amount,
  prefix = "+",
  size = "sm",
  className,
}: QueuePointsBadgeProps) {
  if (size === "lg") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 text-points-strong font-bold text-h3",
          className,
        )}
      >
        <Zap size={20} aria-hidden="true" />
        {prefix}
        {amount} QueuePoints
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-points-soft px-2.5 py-1 text-badge font-semibold text-points-strong leading-none",
        className,
      )}
    >
      <Zap size={13} aria-hidden="true" />
      {prefix}
      {amount} QueuePoints
    </span>
  );
}
