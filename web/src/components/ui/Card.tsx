import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Eleva la tarjeta con sombra (reservado para elementos flotantes/destacados). */
  elevated?: boolean;
  /** Quita el padding interno por defecto. */
  flush?: boolean;
}

/** Contenedor de superficie: fondo surface, borde 1px y radio de card. */
export function Card({
  elevated = false,
  flush = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface",
        !flush && "p-4",
        elevated && "shadow-md",
        className,
      )}
      {...rest}
    />
  );
}
