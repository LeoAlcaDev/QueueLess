import { Check, ShoppingBag, Users } from "lucide-react";
import { cn } from "@/lib/cn";

export type TipoEntrega = "PICKUP" | "DELIVERY";

export interface PickupDeliveryToggleProps {
  value: TipoEntrega;
  onChange: (value: TipoEntrega) => void;
  className?: string;
}

interface Option {
  key: TipoEntrega;
  icon: typeof ShoppingBag;
  title: string;
  sub: string;
}

const OPTIONS: Option[] = [
  {
    key: "PICKUP",
    icon: ShoppingBag,
    title: "Pickup",
    sub: "Recoge en el local · gratis",
  },
  {
    key: "DELIVERY",
    icon: Users,
    title: "Entrega comunitaria",
    sub: "Te lo lleva un compañero · gratis",
  },
];

/** Selección Pickup / Entrega comunitaria. Controlado. */
export function PickupDeliveryToggle({
  value,
  onChange,
  className,
}: PickupDeliveryToggleProps) {
  return (
    <div
      className={cn("flex gap-2.5", className)}
      role="radiogroup"
      aria-label="Tipo de entrega"
    >
      {OPTIONS.map(({ key, icon: Icon, title, sub }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              "relative flex flex-1 flex-col gap-1 rounded-card bg-surface p-4 text-left",
              "focus-visible:shadow-focus focus-visible:outline-none",
              selected
                ? "border-2 border-brand p-[15px]"
                : "border border-line",
            )}
          >
            <Icon
              size={22}
              aria-hidden="true"
              className={
                selected ? "text-brand-hover" : "text-content-secondary"
              }
            />
            <span className="text-small font-semibold text-content">
              {title}
            </span>
            <span className="text-badge text-content-secondary">{sub}</span>
            {selected && (
              <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
