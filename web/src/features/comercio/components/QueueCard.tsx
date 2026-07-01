import { useNavigate } from 'react-router-dom';
import { Icon, Price } from '@/components/ui';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import { TIPO_ENTREGA_LABELS, type PedidoResponse } from '@/types';
import { minutosDesde, resumenItems } from '../utils';
import { OrderActions } from './OrderActions';

interface QueueCardProps {
  pedido: PedidoResponse;
  onChanged: () => void;
}

// a partir de 14 min en cola lo marcamos urgente: el borde y el tiempo se tinen de ambar
const UMBRAL_URGENTE = 14;

// Tarjeta de un pedido dentro de la cola. Muestra lo esencial de un vistazo (codigo, items,
// tipo de entrega, total y cuanto lleva esperando) y, separadas por una linea, las acciones
// segun su estado. Al tocar la tarjeta se abre el detalle; las acciones no propagan ese click.
export function QueueCard({ pedido, onChanged }: QueueCardProps) {
  const navigate = useNavigate();
  // pagadoAt marca cuando entro a la cola; si aun no, usamos la creacion
  const espera = minutosDesde(pedido.pagadoAt ?? pedido.creadoAt);
  const urgente = espera >= UMBRAL_URGENTE;
  const esDelivery = pedido.tipoEntrega === 'DELIVERY';

  return (
    <div
      onClick={() => navigate(paths.comercio.pedido(pedido.id))}
      className={cn(
        'cursor-pointer rounded-card border bg-surface p-3 transition-shadow hover:shadow-md',
        urgente ? 'border-warning-dot' : 'border-line',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[13.5px] font-bold tracking-wide text-ink">{pedido.codigo}</span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 text-[11px]',
            urgente ? 'font-bold text-warning-fg' : 'font-medium text-ink-muted',
          )}
        >
          <Icon name="clock" size={12} />
          {espera} min
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-ink-soft">{resumenItems(pedido.items)}</p>

      <div className="mt-2 flex items-center justify-between gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-pill px-2 py-1 text-[11.5px] font-semibold',
            esDelivery ? 'bg-info-bg text-info-fg' : 'bg-surface-muted text-ink-soft',
          )}
        >
          <Icon name={esDelivery ? 'users' : 'shoppingBag'} size={11} />
          {TIPO_ENTREGA_LABELS[pedido.tipoEntrega]}
        </span>
        <Price amount={pedido.total} className="text-[13.5px]" />
      </div>

      <div className="mt-3 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
        <OrderActions pedido={pedido} onChanged={onChanged} size="sm" context="queue" />
      </div>
    </div>
  );
}
