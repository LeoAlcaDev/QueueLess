import { Check } from "lucide-react";
import { Badge, type BadgeTone } from "./Badge";

/** Los 11 estados internos del pedido (máquina de estados del backend, MAPA §3). */
export type EstadoPedido =
  | "PENDIENTE_PAGO"
  | "PAGADO_BUSCANDO_REPARTIDOR"
  | "PAGADO_ESPERANDO_COMERCIO"
  | "ACEPTADO"
  | "EN_PREPARACION"
  | "LISTO_PARA_RECOGER"
  | "LISTO_PARA_DELIVERY"
  | "ENTREGADO"
  | "CANCELADO_POR_CLIENTE"
  | "CANCELADO_POR_COMERCIO"
  | "EXPIRADO";

interface StateMeta {
  label: string;
  tone: BadgeTone;
  check?: boolean;
}

/** Fuente de verdad de los 11 estados: etiqueta UI + tono semántico. */
export const ORDER_STATES: Record<EstadoPedido, StateMeta> = {
  PENDIENTE_PAGO: { label: "Pendiente de pago", tone: "warning" },
  PAGADO_BUSCANDO_REPARTIDOR: { label: "Buscando repartidor", tone: "info" },
  PAGADO_ESPERANDO_COMERCIO: { label: "Esperando al comercio", tone: "info" },
  ACEPTADO: { label: "Aceptado", tone: "brand" },
  EN_PREPARACION: { label: "En preparación", tone: "brand" },
  LISTO_PARA_RECOGER: { label: "Listo para recoger", tone: "success" },
  LISTO_PARA_DELIVERY: { label: "Listo para delivery", tone: "success" },
  ENTREGADO: { label: "Entregado", tone: "success", check: true },
  CANCELADO_POR_CLIENTE: { label: "Cancelado", tone: "neutral" },
  CANCELADO_POR_COMERCIO: {
    label: "Cancelado por el comercio",
    tone: "neutral",
  },
  EXPIRADO: { label: "Expirado", tone: "neutral" },
};

export interface OrderStatusBadgeProps {
  state: EstadoPedido;
  /** Sobre-escribe la etiqueta por defecto del estado. */
  label?: string;
  className?: string;
}

/** Píldora de estado de pedido (11 estados del MAPA). Punto/ícono + texto, nunca solo color. */
export function OrderStatusBadge({
  state,
  label,
  className,
}: OrderStatusBadgeProps) {
  const meta = ORDER_STATES[state] ?? {
    label: state,
    tone: "neutral" as BadgeTone,
  };
  return (
    <Badge
      tone={meta.tone}
      icon={
        meta.check ? (
          <Check size={13} strokeWidth={3} aria-hidden="true" />
        ) : undefined
      }
      className={className}
    >
      {label ?? meta.label}
    </Badge>
  );
}
