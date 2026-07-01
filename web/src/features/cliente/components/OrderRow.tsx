import { Link } from 'react-router-dom';
import { Card, Icon, Price, StatusPill } from '@/components/ui';
import { paths } from '@/routes/paths';
import { TIPO_ENTREGA_LABELS, type PedidoResponse } from '@/types';
import { formatFechaHora } from '../lib/format';

interface OrderRowProps {
  pedido: PedidoResponse;
  vendorNombre?: string;
}

// Fila de un pedido en "Mis pedidos". Lleva al detalle al tocarla.
export function OrderRow({ pedido, vendorNombre }: OrderRowProps) {
  return (
    <Link to={paths.cliente.pedido(pedido.id)} className="block">
      <Card hover className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-small font-bold text-ink">{pedido.codigo}</span>
            <span className="text-[12.5px] text-ink-muted">{TIPO_ENTREGA_LABELS[pedido.tipoEntrega]}</span>
          </div>
          <div className="mt-0.5 truncate text-small text-ink-soft">
            {vendorNombre ?? `Local #${pedido.puntoDeVentaId}`}
          </div>
          <div className="mt-0.5 text-[12.5px] text-ink-muted">{formatFechaHora(pedido.creadoAt)}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusPill estado={pedido.estado} />
          <Price amount={pedido.total} />
        </div>
        <Icon name="chevronRight" size={18} className="shrink-0 text-ink-muted" />
      </Card>
    </Link>
  );
}
