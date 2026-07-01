import { type EstadoPedido, type PedidoResponse } from '@/types';
import { QueueCard } from './QueueCard';

interface QueueColumnProps {
  estado: EstadoPedido;
  pedidos: PedidoResponse[];
  onChanged: () => void;
}

// Titulos cortos para el encabezado del tablero. Son mas concisos que la etiqueta larga del
// estado porque la columna ya da el contexto y el espacio es ajustado.
const TITULO_COLUMNA: Partial<Record<EstadoPedido, string>> = {
  PAGADO_ESPERANDO_COMERCIO: 'Por aceptar',
  ACEPTADO: 'Aceptados',
  EN_PREPARACION: 'En preparación',
  LISTO_PARA_RECOGER: 'Listos para recoger',
  LISTO_PARA_DELIVERY: 'Listos para delivery',
};

// Una columna del tablero de la cola: un panel tenue con el encabezado del estado y su
// conteo, y debajo las tarjetas de los pedidos en ese estado.
export function QueueColumn({ estado, pedidos, onChanged }: QueueColumnProps) {
  return (
    <div className="flex w-full min-w-[210px] flex-1 flex-col gap-2.5 rounded-card bg-surface-muted p-2.5">
      <div className="flex items-center justify-between px-1.5 pb-0.5">
        <span className="text-[12.5px] font-bold text-ink-soft">{TITULO_COLUMNA[estado] ?? estado}</span>
        <span className="grid h-5 min-w-[20px] place-items-center rounded-pill border border-line bg-surface px-1.5 text-[11px] font-bold tabular-nums text-ink-soft">
          {pedidos.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {pedidos.length === 0 ? (
          <div className="py-4 text-center text-[12px] text-ink-muted">—</div>
        ) : (
          pedidos.map((pedido) => <QueueCard key={pedido.id} pedido={pedido} onChanged={onChanged} />)
        )}
      </div>
    </div>
  );
}
