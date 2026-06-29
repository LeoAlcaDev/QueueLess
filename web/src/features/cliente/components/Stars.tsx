import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface StarsProps {
  /** Calificación 1–5 (admite decimales para mostrar). */
  value: number;
  size?: number;
  /** Si se pasa, las estrellas son interactivas (selección 1–5). */
  onChange?: (value: number) => void;
  className?: string;
}

/** Calificación por estrellas. Solo lectura por defecto; interactiva con onChange. */
export function Stars({ value, size = 16, onChange, className }: StarsProps) {
  const interactive = !!onChange;
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : undefined}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = (
          <Star
            size={size}
            className={
              filled
                ? "fill-warning-dot text-warning-dot"
                : "text-content-muted"
            }
            aria-hidden="true"
          />
        );
        if (!interactive) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === Math.round(value)}
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            onClick={() => onChange(n)}
            className="rounded-pill p-0.5 focus-visible:shadow-focus focus-visible:outline-none"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
