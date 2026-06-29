import { cn } from "@/lib/cn";

export interface SpinnerProps {
  /** Diámetro en px. */
  size?: number;
  className?: string;
  "aria-label"?: string;
}

/** Indicador de carga circular. Hereda el color del texto (currentColor). */
export function Spinner({
  size = 18,
  className,
  "aria-label": ariaLabel,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel ?? "Cargando"}
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      style={{ width: size, height: size, opacity: 0.9 }}
    />
  );
}
