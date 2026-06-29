import { Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatSoles } from "@/lib/format";
import type { ProductoResponse } from "@/types";

interface ProductoCardProps {
  producto: ProductoResponse;
  /** Unidades en el carrito (0 = no agregado). */
  cantidad: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}

/** Producto del menú con control de cantidad. Respeta `disponibleAhora`/`razonNoDisponible`. */
export function ProductoCard({
  producto,
  cantidad,
  onAdd,
  onInc,
  onDec,
}: ProductoCardProps) {
  // disponibleAhora puede venir null (sin ventana horaria): solo bloquea si es false.
  const orderable = producto.disponible && producto.disponibleAhora !== false;

  return (
    <Card className={cn("flex gap-3", !orderable && "opacity-70")}>
      {producto.fotoUrl && (
        <img
          src={producto.fotoUrl}
          alt=""
          className="h-20 w-20 shrink-0 rounded-card object-cover"
          loading="lazy"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-body font-semibold text-content">
            {producto.nombre}
          </h3>
          <span className="shrink-0 text-body font-semibold text-content">
            {formatSoles(producto.precio)}
          </span>
        </div>
        {producto.descripcion && (
          <p className="line-clamp-2 text-small text-content-secondary">
            {producto.descripcion}
          </p>
        )}

        {!orderable ? (
          <p className="mt-1 text-small text-content-muted">
            {producto.razonNoDisponible ?? "No disponible ahora."}
          </p>
        ) : cantidad > 0 ? (
          <div className="mt-2 flex items-center gap-3 self-end">
            <Stepper
              cantidad={cantidad}
              onInc={onInc}
              onDec={onDec}
              nombre={producto.nombre}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 self-end rounded-button border border-line px-3 py-1.5",
              "text-small font-semibold text-content-brand hover:bg-brand-soft",
              "focus-visible:shadow-focus focus-visible:outline-none",
            )}
          >
            <Plus size={16} aria-hidden="true" />
            Agregar
          </button>
        )}
      </div>
    </Card>
  );
}

function Stepper({
  cantidad,
  onInc,
  onDec,
  nombre,
}: {
  cantidad: number;
  onInc: () => void;
  onDec: () => void;
  nombre: string;
}) {
  const btn =
    "grid h-9 w-9 place-items-center rounded-pill border border-line text-content hover:bg-surface-muted focus-visible:shadow-focus focus-visible:outline-none";
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onDec}
        aria-label={`Quitar una unidad de ${nombre}`}
        className={btn}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <span
        className="min-w-5 text-center text-body font-semibold text-content"
        aria-live="polite"
      >
        {cantidad}
      </span>
      <button
        type="button"
        onClick={onInc}
        aria-label={`Agregar una unidad de ${nombre}`}
        className={btn}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
