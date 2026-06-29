import { useEffect, useRef, useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { pagosApi } from "@/api";
import { Button, Card, Spinner, useToast } from "@/components/ui";
import { isApiError, userFacingMessage } from "@/lib/errors";
import { formatSoles } from "@/lib/format";
import type { IniciarPagoResponse } from "@/types";

interface PagoPanelProps {
  pedidoId: number;
  total: number;
  /** Se llama cuando el pago se confirma (el padre re-fetchea el pedido). */
  onConfirmed: () => void;
}

/**
 * Inicia el pago y espera la confirmación **asíncrona** (webhook): abre el
 * checkout y hace polling de `GET /cliente/pagos/{id}` hasta CONFIRMADO. En dev
 * ofrece disparar el webhook mock. El 409 "ya tiene pago" pasa a modo espera.
 */
export function PagoPanel({ pedidoId, total, onConfirmed }: PagoPanelProps) {
  const toast = useToast();
  const [iniciando, setIniciando] = useState(false);
  const [pago, setPago] = useState<IniciarPagoResponse | null>(null);
  const [esperando, setEsperando] = useState(false);
  const [simulando, setSimulando] = useState(false);
  const confirmedRef = useRef(false);

  // Polling del estado del pago mientras esté PENDIENTE.
  useEffect(() => {
    if (!pago) return;
    let stop = false;
    const tick = async () => {
      try {
        const actual = await pagosApi.getPago(pago.pagoId);
        if (stop) return;
        if (actual.estado === "CONFIRMADO") {
          confirmedRef.current = true;
          onConfirmed();
        } else if (
          actual.estado === "FALLIDO" ||
          actual.estado === "REEMBOLSADO"
        ) {
          setEsperando(false);
          setPago(null);
          toast.error("El pago no se completó. Intentá de nuevo.");
        }
      } catch {
        // Reintenta en el próximo tick.
      }
    };
    const interval = window.setInterval(() => {
      if (!confirmedRef.current) void tick();
    }, 3000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(interval);
    };
  }, [pago, onConfirmed, toast]);

  async function pagar() {
    setIniciando(true);
    try {
      const resp = await pagosApi.iniciarPago({ pedidoId });
      setPago(resp);
      setEsperando(true);
      if (resp.urlCheckout) window.open(resp.urlCheckout, "_blank", "noopener");
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        // Ya hay un pago en curso: esperar la confirmación por SSE/polling del pedido.
        setEsperando(true);
        toast.info("Ya hay un pago en curso para este pedido.");
      } else {
        toast.error(userFacingMessage(err));
      }
    } finally {
      setIniciando(false);
    }
  }

  async function simularPago() {
    if (!pago?.referenciaExterna) return;
    setSimulando(true);
    try {
      await pagosApi.dispararWebhookMock(pago.referenciaExterna);
      // El polling/SSE detectará el CONFIRMADO.
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setSimulando(false);
    }
  }

  if (esperando) {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Spinner size={18} />
          <span className="text-body font-medium text-content">
            Confirmando pago…
          </span>
        </div>
        <p className="text-small text-content-secondary">
          Completá el pago en la ventana de checkout. Esta pantalla se actualiza
          sola.
        </p>
        {pago?.urlCheckout && (
          <a
            href={pago.urlCheckout}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-small font-semibold text-content-brand"
          >
            <ExternalLink size={15} aria-hidden="true" />
            Volver a abrir el checkout
          </a>
        )}
        {import.meta.env.DEV && pago?.referenciaExterna && (
          <Button
            variant="secondary"
            size="sm"
            loading={simulando}
            onClick={simularPago}
            className="self-start"
          >
            Simular pago (dev)
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Button
      full
      leftIcon={<CreditCard size={18} />}
      loading={iniciando}
      onClick={pagar}
    >
      Pagar {formatSoles(total)}
    </Button>
  );
}
