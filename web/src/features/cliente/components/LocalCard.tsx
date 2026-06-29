import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Badge, Card, WaitTimeBadge } from "@/components/ui";
import type { PuntoDeVentaResponse } from "@/types";

interface LocalCardProps {
  local: PuntoDeVentaResponse;
  /** Ruta al detalle (cambia según haya sesión o no). */
  to: string;
}

/** Tarjeta de local en el catálogo. */
export function LocalCard({ local, to }: LocalCardProps) {
  return (
    <Link
      to={to}
      className="focus-visible:shadow-focus rounded-card focus-visible:outline-none"
    >
      <Card className="flex h-full flex-col gap-2 hover:bg-surface-muted">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-h3 font-semibold text-content">{local.nombre}</h3>
          <Badge tone={local.abierto ? "success" : "neutral"}>
            {local.abierto ? "Abierto" : "Cerrado"}
          </Badge>
        </div>
        <p className="flex items-center gap-1.5 text-small text-content-secondary">
          <MapPin size={14} aria-hidden="true" />
          <span className="truncate">{local.ubicacion}</span>
        </p>
        {local.tiempoEsperaEstimado != null && (
          <div className="mt-auto pt-1">
            <WaitTimeBadge minutes={local.tiempoEsperaEstimado} />
          </div>
        )}
      </Card>
    </Link>
  );
}
