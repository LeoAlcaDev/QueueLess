import { Link } from 'react-router-dom';
import { Card, Chip, Icon, WaitTimeBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import type { PuntoDeVentaResponse } from '@/types';

// Tarjeta de un local en el catalogo. Lleva una banda con placeholder de foto y, abajo, el
// nombre, la ubicacion y el tiempo de espera. Toda la tarjeta lleva al detalle del local.
export function VendorCard({ vendor }: { vendor: PuntoDeVentaResponse }) {
  return (
    <Link to={paths.cliente.local(vendor.id)} className="block h-full">
      <Card hover pad="none" className="flex h-full flex-col overflow-hidden">
        <div className="relative grid h-36 place-items-center bg-surface-muted text-ink-muted">
          <Icon name="utensils" size={36} strokeWidth={1.5} />
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1 text-badge font-semibold text-ink">
            <span className={cn('h-1.5 w-1.5 rounded-full', vendor.abierto ? 'bg-accent' : 'bg-ink-muted')} />
            {vendor.abierto ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="text-h3 font-semibold text-ink">{vendor.nombre}</h3>
          <div className="flex items-center gap-1.5 text-small text-ink-soft">
            <Icon name="mapPin" size={14} className="shrink-0 text-ink-muted" />
            <span className="truncate">{vendor.ubicacion}</span>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <WaitTimeBadge minutes={vendor.tiempoEsperaEstimado} />
            {vendor.tasaCumplimiento != null && (
              <Chip tone="info" size="sm" icon="checkCircle">
                {Math.round(vendor.tasaCumplimiento * 100)}% cumplimiento
              </Chip>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
