import { Card, Icon, IconButton, Price, Toggle } from '@/components/ui';
import type { ProductoResponse } from '@/types';

interface ProductCardProps {
  producto: ProductoResponse;
  onToggle: (disponible: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  toggling?: boolean;
}

// Fila de un producto del catalogo: foto, nombre, categoria y precio, con el interruptor de
// disponibilidad y los accesos a editar y eliminar a la derecha. Densa, pensada para repasar
// la carta de un vistazo.
export function ProductCard({ producto, onToggle, onEdit, onDelete, toggling }: ProductCardProps) {
  return (
    <Card pad="sm" className="flex items-center gap-3">
      <div className="grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-input bg-surface-muted text-ink-muted">
        {producto.fotoUrl ? (
          <img src={producto.fotoUrl} alt={producto.nombre} className="h-full w-full object-cover" />
        ) : (
          <Icon name="image" size={20} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-small font-semibold text-ink">{producto.nombre}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          {producto.categoria && <span className="truncate">{producto.categoria}</span>}
          {producto.categoria && <span aria-hidden>·</span>}
          <Price amount={producto.precio} strong={false} className="text-[12.5px]" />
        </div>
        {!producto.disponibleAhora && producto.razonNoDisponible && (
          <p className="mt-1 text-[12px] text-warning-fg">{producto.razonNoDisponible}</p>
        )}
      </div>

      <Toggle checked={producto.disponible} disabled={toggling} onChange={onToggle} />
      <div className="flex shrink-0 gap-1.5">
        <IconButton icon="edit" label="Editar producto" variant="surface" size={36} onClick={onEdit} />
        <IconButton icon="trash" label="Eliminar producto" variant="surface" size={36} onClick={onDelete} />
      </div>
    </Card>
  );
}
