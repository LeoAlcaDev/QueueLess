import { Card, Chip, Icon, IconButton, Toggle } from '@/components/ui';
import type { PuntoDeVentaResponse } from '@/types';
import { formatHora } from '../utils';

interface StoreCardProps {
  local: PuntoDeVentaResponse;
  onToggle: (abierto: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  toggling?: boolean;
}

// Tarjeta de un local: nombre, ubicacion, horario y cumplimiento, con el estado abierto/cerrado
// arriba y, separados por una linea, el interruptor y los accesos a editar y eliminar.
export function StoreCard({ local, onToggle, onEdit, onDelete, toggling }: StoreCardProps) {
  const cumplimiento = local.tasaCumplimiento;
  return (
    <Card pad="md" className="flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15.5px] font-bold text-ink">{local.nombre}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
            <Icon name="mapPin" size={12} className="shrink-0" />
            <span className="truncate">{local.ubicacion}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={11} />
              {formatHora(local.horarioApertura)} – {formatHora(local.horarioCierre)}
            </span>
            {typeof cumplimiento === 'number' && <span>{Math.round(cumplimiento * 100)}% cumplimiento</span>}
          </div>
        </div>
        <Chip tone={local.abierto ? 'success' : 'neutral'}>{local.abierto ? 'Abierto' : 'Cerrado'}</Chip>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <Toggle
          checked={local.abierto}
          disabled={toggling}
          onChange={onToggle}
          label={local.abierto ? 'Abierto' : 'Cerrado'}
        />
        <div className="flex shrink-0 gap-1.5">
          <IconButton icon="edit" label="Editar local" variant="surface" size={36} onClick={onEdit} />
          <IconButton icon="trash" label="Eliminar local" variant="surface" size={36} onClick={onDelete} />
        </div>
      </div>
    </Card>
  );
}
