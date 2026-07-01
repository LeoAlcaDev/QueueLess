import { Link } from 'react-router-dom';
import { Button, Card, Chip, Icon, Price, WaitTimeBadge } from '@/components/ui';
import { paths } from '@/routes/paths';
import type { RecomendacionItem } from '@/types';
import { FoodThumb } from './FoodThumb';

// Tarjeta de una recomendacion del asistente: producto, local, precio, tiempo estimado y si
// entra en el presupuesto. El boton "Pedir" lleva al local para armar el pedido.
export function RecommendationCard({ rec }: { rec: RecomendacionItem }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex gap-3">
        <FoodThumb size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-small font-bold text-ink">{rec.nombre}</div>
            <Price amount={rec.precio} className="shrink-0 text-small" />
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <Icon name="store" size={12} />
            <span className="truncate">{rec.puntoDeVentaNombre}</span>
          </div>
          {rec.descripcion && <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-soft">{rec.descripcion}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <WaitTimeBadge minutes={rec.minutosEstimados} />
          {rec.dentroDePresupuesto && (
            <Chip tone="success" size="sm" icon="check">
              Dentro de tu presupuesto
            </Chip>
          )}
        </div>
        <Link to={paths.cliente.local(rec.puntoDeVentaId)}>
          <Button size="sm" icon="plus">
            Pedir
          </Button>
        </Link>
      </div>
    </Card>
  );
}
