import { useState, type ReactNode } from "react";
import { Check, ChefHat, PackageCheck, ThumbsUp } from "lucide-react";
import { pedidosComercioApi } from "@/api";
import { Button, useToast } from "@/components/ui";
import { userFacingMessage } from "@/lib/errors";
import type { MotivoCancelacionRequest, PedidoResponse } from "@/types";
import { MarcarEntregadoModal } from "./MarcarEntregadoModal";
import { MotivoCancelacionModal } from "./MotivoCancelacionModal";

interface AccionesPedidoProps {
  pedido: PedidoResponse;
  /** Se llama tras cualquier acción (éxito o 422) para refrescar cola/detalle. */
  onChanged: () => void;
  size?: "sm" | "md";
}

/**
 * Acciones que el comercio habilita según el estado del pedido (MAPA §4). Un 422
 * (transición ilegal por carrera con el SSE) se muestra y dispara un refresco.
 */
export function AccionesPedido({
  pedido,
  onChanged,
  size = "md",
}: AccionesPedidoProps) {
  const toast = useToast();
  const [acting, setActing] = useState(false);
  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [entregarOpen, setEntregarOpen] = useState(false);

  async function runAction(fn: () => Promise<unknown>, okMsg: string) {
    setActing(true);
    try {
      await fn();
      toast.success(okMsg);
      setRechazarOpen(false);
      setCancelarOpen(false);
      setEntregarOpen(false);
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      onChanged();
      setActing(false);
    }
  }

  const id = pedido.id;
  const estado = pedido.estado;

  // Estados terminales o sin acción del comercio (BUSCANDO/LISTO_PARA_DELIVERY).
  const acciones: ReactNode[] = [];

  if (estado === "PAGADO_ESPERANDO_COMERCIO") {
    acciones.push(
      <Button
        key="aceptar"
        size={size}
        leftIcon={<ThumbsUp size={16} />}
        loading={acting}
        onClick={() =>
          runAction(() => pedidosComercioApi.aceptar(id), "Pedido aceptado.")
        }
      >
        Aceptar
      </Button>,
      <Button
        key="rechazar"
        variant="ghost"
        size={size}
        disabled={acting}
        onClick={() => setRechazarOpen(true)}
        className="text-error-fg"
      >
        Rechazar
      </Button>,
    );
  } else if (estado === "ACEPTADO") {
    acciones.push(
      <Button
        key="preparar"
        size={size}
        leftIcon={<ChefHat size={16} />}
        loading={acting}
        onClick={() =>
          runAction(
            () => pedidosComercioApi.iniciarPreparacion(id),
            "En preparación.",
          )
        }
      >
        Iniciar preparación
      </Button>,
      <Button
        key="cancelar"
        variant="ghost"
        size={size}
        disabled={acting}
        onClick={() => setCancelarOpen(true)}
        className="text-error-fg"
      >
        Cancelar
      </Button>,
    );
  } else if (estado === "EN_PREPARACION") {
    acciones.push(
      <Button
        key="listo"
        size={size}
        leftIcon={<Check size={16} />}
        loading={acting}
        onClick={() =>
          runAction(() => pedidosComercioApi.marcarListo(id), "Pedido listo.")
        }
      >
        Marcar listo
      </Button>,
      <Button
        key="cancelar"
        variant="ghost"
        size={size}
        disabled={acting}
        onClick={() => setCancelarOpen(true)}
        className="text-error-fg"
      >
        Cancelar
      </Button>,
    );
  } else if (estado === "LISTO_PARA_RECOGER") {
    acciones.push(
      <Button
        key="entregar"
        size={size}
        leftIcon={<PackageCheck size={16} />}
        disabled={acting}
        onClick={() => setEntregarOpen(true)}
      >
        Marcar entregado
      </Button>,
    );
  }

  if (acciones.length === 0) {
    return (
      <p className="text-small text-content-muted">
        Sin acciones para este estado.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">{acciones}</div>

      <MotivoCancelacionModal
        open={rechazarOpen}
        onClose={() => setRechazarOpen(false)}
        title={`Rechazar pedido #${pedido.codigo}`}
        confirmLabel="Rechazar"
        submitting={acting}
        onConfirm={(body: MotivoCancelacionRequest) =>
          runAction(
            () => pedidosComercioApi.rechazar(id, body),
            "Pedido rechazado.",
          )
        }
      />
      <MotivoCancelacionModal
        open={cancelarOpen}
        onClose={() => setCancelarOpen(false)}
        title={`Cancelar pedido #${pedido.codigo}`}
        confirmLabel="Cancelar pedido"
        submitting={acting}
        onConfirm={(body: MotivoCancelacionRequest) =>
          runAction(
            () => pedidosComercioApi.cancelar(id, body),
            "Pedido cancelado.",
          )
        }
      />
      <MarcarEntregadoModal
        open={entregarOpen}
        onClose={() => setEntregarOpen(false)}
        codigoPedido={pedido.codigo}
        submitting={acting}
        onConfirm={(codigo) =>
          runAction(
            () => pedidosComercioApi.marcarEntregado(id, { codigo }),
            "Entrega confirmada.",
          )
        }
      />
    </>
  );
}
