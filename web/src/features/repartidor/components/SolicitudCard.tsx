import type { ReactNode } from "react";
import { MapPin, Package, Send } from "lucide-react";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { SolicitudDeliveryResponse } from "@/types";
import { SolicitudEstadoBadge } from "./SolicitudEstadoBadge";

interface SolicitudCardProps {
  solicitud: SolicitudDeliveryResponse;
  /** Acciones o enlace al detalle (pie de la tarjeta). */
  footer?: ReactNode;
}

/** Tarjeta de una solicitud de delivery (reusada en Disponibles y Mis entregas). */
export function SolicitudCard({ solicitud: s, footer }: SolicitudCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-h3 font-semibold text-content">
            Pedido #{s.pedidoId}
          </h3>
          <p className="inline-flex items-center gap-1 text-small text-content-secondary">
            <Package size={13} aria-hidden="true" />
            {s.puntoDeVentaNombre}
          </p>
        </div>
        <SolicitudEstadoBadge estado={s.estado} />
      </div>

      <div className="flex flex-col gap-1 text-small text-content-secondary">
        <p className="inline-flex items-center gap-1.5">
          <MapPin size={13} aria-hidden="true" />
          Recoger en: {s.puntoDeVentaUbicacion}
        </p>
        {s.zonaEntrega && (
          <p className="inline-flex items-center gap-1.5">
            <Send size={13} aria-hidden="true" />
            Entregar en: {s.zonaEntrega}
          </p>
        )}
      </div>

      <p className="text-small text-content-muted">
        {s.entregadoAt
          ? `Entregada ${formatDateTime(s.entregadoAt)}`
          : s.recogidoAt
            ? `Recogida ${formatDateTime(s.recogidoAt)}`
            : s.asignadoAt
              ? `Asignada ${formatDateTime(s.asignadoAt)}`
              : `Disponible desde ${formatDateTime(s.busquedaInicioAt)}`}
      </p>

      {footer && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {footer}
        </div>
      )}
    </Card>
  );
}
