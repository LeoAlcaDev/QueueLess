import { Button, Card, Chip } from '@/components/ui';
import type { SolicitudDeliveryResponse } from '@/types';
import { formatHora } from './time';

interface SolicitudCardProps {
  solicitud: SolicitudDeliveryResponse;
  onAceptar: (id: number) => void;
  loading?: boolean;
  disabled?: boolean;
}

// Tarjeta de una solicitud disponible. Pinta el recorrido origen -> destino con un conector,
// el premio en QueuePoints y desde cuando espera el cliente. La accion principal es grande:
// aceptar la entrega.
export function SolicitudCard({ solicitud, onAceptar, loading, disabled }: SolicitudCardProps) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="h-2.5 w-2.5 rounded-pill bg-brand-strong" />
          <span className="h-6 w-0.5 bg-line" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-points" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="ql-section-label">Origen</div>
          <div className="truncate text-[14px] font-semibold text-ink">{solicitud.puntoDeVentaNombre}</div>
          <div className="truncate text-[12.5px] text-ink-soft">{solicitud.puntoDeVentaUbicacion}</div>
          <div className="ql-section-label mt-2">Destino</div>
          <div className="truncate text-[14px] font-semibold text-ink">{solicitud.zonaEntrega}</div>
        </div>
      </div>

      <div className="my-3 flex flex-wrap items-center gap-1.5">
        <Chip tone="points" icon="bolt">
          +50 QueuePoints
        </Chip>
        <Chip tone="warning" icon="clock">
          Espera desde {formatHora(solicitud.busquedaInicioAt)}
        </Chip>
      </div>

      <div className="mb-3 border-t border-line pt-2.5 text-[12.5px] text-ink-soft">
        Pedido #{solicitud.pedidoId}
      </div>

      <Button full loading={loading} disabled={disabled} onClick={() => onAceptar(solicitud.id)}>
        Aceptar entrega
      </Button>
    </Card>
  );
}
