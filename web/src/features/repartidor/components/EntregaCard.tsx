import { Card, Chip, Icon } from '@/components/ui';
import type { SolicitudDeliveryResponse } from '@/types';
import { EstadoSolicitudChip } from './EstadoSolicitudChip';
import { formatFechaHora } from './time';

// Para el historial mostramos el momento mas avanzado que alcanzo la solicitud.
function momentoRelevante(solicitud: SolicitudDeliveryResponse): string | null {
  return solicitud.entregadoAt ?? solicitud.recogidoAt ?? solicitud.asignadoAt ?? solicitud.busquedaInicioAt;
}

export function EntregaCard({ solicitud }: { solicitud: SolicitudDeliveryResponse }) {
  const entregada = solicitud.estado === 'ENTREGADO';
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold text-ink">{solicitud.puntoDeVentaNombre}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <Icon name="mapPinned" size={13} className="shrink-0" />
            <span className="truncate">{solicitud.zonaEntrega}</span>
          </div>
        </div>
        <EstadoSolicitudChip estado={solicitud.estado} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[12px] text-ink-muted">
          <Icon name="clock" size={13} className="shrink-0" />
          {formatFechaHora(momentoRelevante(solicitud))}
        </span>
        {entregada && (
          <Chip tone="points" icon="bolt">
            +50
          </Chip>
        )}
      </div>
    </Card>
  );
}
