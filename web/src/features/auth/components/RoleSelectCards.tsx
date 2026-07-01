import { Card, Icon, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Rol } from '@/types';

interface RoleSelectCardsProps {
  value: Rol[];
  onChange: (roles: Rol[]) => void;
  error?: string;
}

// Cada opcion describe una accion ("¿que quieres hacer?"), no el nombre del rol; por eso el
// texto habla de la intencion y no usa ROL_LABELS.
const ROLE_META: { rol: Rol; icon: IconName; label: string; sub: string }[] = [
  { rol: 'CLIENTE', icon: 'shoppingBag', label: 'Pedir comida', sub: 'Explora y pre-ordena en el campus' },
  { rol: 'COMERCIO', icon: 'store', label: 'Vender (comercio)', sub: 'Gestiona pedidos desde tu local' },
  { rol: 'REPARTIDOR', icon: 'bike', label: 'Hacer entregas', sub: 'Lleva pedidos y gana QueuePoints' },
];

// Selector multiple de roles con tarjetas. Un usuario puede tener mas de un rol a la vez
// (por ejemplo cliente y repartidor), asi que se pueden marcar varias.
export function RoleSelectCards({ value, onChange, error }: RoleSelectCardsProps) {
  const toggle = (rol: Rol) => {
    if (value.includes(rol)) {
      onChange(value.filter((r) => r !== rol));
    } else {
      onChange([...value, rol]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2.5">
        {ROLE_META.map(({ rol, icon, label, sub }) => {
          const selected = value.includes(rol);
          return (
            <Card
              key={rol}
              pad="none"
              selected={selected}
              hover
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => toggle(rol)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(rol);
                }
              }}
              className="flex cursor-pointer items-center gap-3 px-3.5 py-3"
            >
              <span
                className={cn(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-pill',
                  selected ? 'bg-brand-soft text-brand-text' : 'bg-surface-muted text-ink-muted',
                )}
              >
                <Icon name={icon} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-small font-semibold text-ink">{label}</div>
                <div className="text-[12.5px] text-ink-soft">{sub}</div>
              </div>
              <span
                className={cn(
                  'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-pill border-2 text-on-brand transition',
                  selected ? 'border-brand-strong bg-brand-strong' : 'border-line-strong bg-surface',
                )}
              >
                {selected && <Icon name="check" size={12} strokeWidth={3} />}
              </span>
            </Card>
          );
        })}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-small text-error-fg">
          <Icon name="alertCircle" size={13} />
          {error}
        </p>
      )}
    </div>
  );
}
