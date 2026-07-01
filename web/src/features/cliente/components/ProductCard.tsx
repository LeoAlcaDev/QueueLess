import { Button, Card, Chip, Icon, Price, Stepper } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  ALERGENO_LABELS,
  APTITUD_LABELS,
  PICANTE_LABELS,
  type ProductoResponse,
} from '@/types';
import { FoodThumb } from './FoodThumb';

interface ProductCardProps {
  producto: ProductoResponse;
  cantidad: number;
  onAdd: () => void;
  onSetQty: (cantidad: number) => void;
}

// Tarjeta de un producto en el menu del local: foto, precio, alergenos, aptitudes y picante.
// Deja agregar al carrito o ajustar la cantidad. Lo no disponible se atenua y dice por que.
export function ProductCard({ producto, cantidad, onAdd, onSetQty }: ProductCardProps) {
  const alergenosTexto = producto.alergenos.map((a) => ALERGENO_LABELS[a]).join(', ');
  const muestraPicante = producto.nivelPicante && producto.nivelPicante !== 'NINGUNA';
  const bloqueado = !producto.disponibleAhora;

  return (
    <Card className="flex gap-3">
      <FoodThumb src={producto.fotoUrl} alt={producto.nombre} size={72} className={cn(bloqueado && 'opacity-60')} />
      <div className={cn('flex min-w-0 flex-1 flex-col gap-2', bloqueado && 'opacity-70')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-ink">{producto.nombre}</div>
            {producto.descripcion && (
              <p className="mt-0.5 line-clamp-2 text-small text-ink-soft">{producto.descripcion}</p>
            )}
          </div>
          <Price amount={producto.precio} className="shrink-0" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {producto.aptitudesDieteticas.map((apt) => (
            <Chip key={apt} tone="success" size="sm" icon="leaf">
              {APTITUD_LABELS[apt]}
            </Chip>
          ))}
          {muestraPicante && (
            <Chip tone="warning" size="sm" icon="flame">
              Picante {PICANTE_LABELS[producto.nivelPicante!].toLowerCase()}
            </Chip>
          )}
          {producto.alergenos.length > 0 && (
            <Chip tone="error" size="sm" icon="alertTriangle">
              Contiene: {alergenosTexto}
            </Chip>
          )}
        </div>

        {bloqueado && producto.razonNoDisponible && (
          <div className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <Icon name="clock" size={13} />
            {producto.razonNoDisponible}
          </div>
        )}

        <div className="mt-1">
          {cantidad > 0 ? (
            <Stepper value={cantidad} onChange={onSetQty} max={20} />
          ) : (
            <Button size="sm" variant="secondary" icon="plus" onClick={onAdd} disabled={bloqueado}>
              Agregar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
