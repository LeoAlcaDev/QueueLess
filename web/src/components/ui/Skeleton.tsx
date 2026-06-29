import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Bloque de carga con shimmer. Pasar w/h vía className o style. */
export function Skeleton({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-input bg-surface-muted", className)}
      {...rest}
    />
  );
}
