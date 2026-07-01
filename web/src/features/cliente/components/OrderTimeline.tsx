import { ORDER_STATES, type EstadoPedido, type TipoEntrega } from '@/types';
import { Icon, StatusPill } from '@/components/ui';
import { cn } from '@/lib/cn';

// Camino feliz por tipo de entrega. El delivery suma la busqueda de repartidor y termina
// "listo para delivery"; el recojo termina "listo para recoger".
const PASOS_PICKUP: EstadoPedido[] = [
  'PENDIENTE_PAGO',
  'PAGADO_ESPERANDO_COMERCIO',
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO_PARA_RECOGER',
  'ENTREGADO',
];

const PASOS_DELIVERY: EstadoPedido[] = [
  'PENDIENTE_PAGO',
  'PAGADO_BUSCANDO_REPARTIDOR',
  'PAGADO_ESPERANDO_COMERCIO',
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO_PARA_DELIVERY',
  'ENTREGADO',
];

const TERMINALES_CORTE: EstadoPedido[] = ['CANCELADO_POR_CLIENTE', 'CANCELADO_POR_COMERCIO', 'EXPIRADO'];

export function OrderTimeline({ estado, tipoEntrega }: { estado: EstadoPedido; tipoEntrega: TipoEntrega }) {
  // los estados de corte no siguen el camino feliz: los mostramos como un cierre distinto
  if (TERMINALES_CORTE.includes(estado)) {
    return (
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <StatusPill estado={estado} />
        <p className="text-small text-ink-soft">Este pedido no continuó su preparación.</p>
      </div>
    );
  }

  const pasos = tipoEntrega === 'DELIVERY' ? PASOS_DELIVERY : PASOS_PICKUP;
  const actual = pasos.indexOf(estado);

  return (
    <ol className="flex flex-col">
      {pasos.map((paso, index) => {
        const hecho = actual >= 0 && index < actual;
        const enCurso = index === actual;
        const ultimo = index === pasos.length - 1;
        return (
          <li key={paso} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-pill border-2 transition-colors',
                  hecho && 'border-brand-strong bg-brand-strong text-on-brand',
                  enCurso && 'border-brand bg-brand-soft text-brand-text',
                  !hecho && !enCurso && 'border-line bg-surface text-ink-muted',
                )}
              >
                {hecho ? <Icon name="check" size={14} strokeWidth={3} /> : <span className="text-[12px] font-bold">{index + 1}</span>}
              </span>
              {!ultimo && <span className={cn('w-0.5 flex-1', hecho ? 'bg-brand-strong' : 'bg-line')} style={{ minHeight: 28 }} />}
            </div>
            <div className={cn('pb-5 pt-1', enCurso ? 'font-bold text-ink' : 'text-ink-soft')}>
              <div className="text-small">{ORDER_STATES[paso].label}</div>
              {enCurso && <div className="text-[12.5px] font-normal text-brand-text">En este momento</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
