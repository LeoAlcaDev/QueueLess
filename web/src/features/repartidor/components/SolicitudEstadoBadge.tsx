import { Badge, type BadgeTone } from "@/components/ui";
import type { EstadoSolicitudDelivery } from "@/types";

// Estado de la solicitud de delivery → tono + etiqueta (estado nunca solo por color).
const MAPA: Record<
  EstadoSolicitudDelivery,
  { tone: BadgeTone; label: string }
> = {
  BUSCANDO: { tone: "warning", label: "Buscando repartidor" },
  ASIGNADO: { tone: "info", label: "Asignada" },
  RECOGIDO: { tone: "brand", label: "Recogida" },
  ENTREGADO: { tone: "success", label: "Entregada" },
  SIN_REPARTIDOR: { tone: "neutral", label: "Sin repartidor" },
};

export function SolicitudEstadoBadge({
  estado,
}: {
  estado: EstadoSolicitudDelivery;
}) {
  const { tone, label } = MAPA[estado];
  return <Badge tone={tone}>{label}</Badge>;
}
