import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui";

export interface UpcomingItem {
  icon: LucideIcon;
  label: string;
  /** En qué etapa del plan llega esta pantalla. */
  etapa: number;
}

interface RoleHomeProps {
  title: string;
  subtitle: string;
  upcoming: UpcomingItem[];
}

/**
 * Home de área (placeholder de Etapa 2). Saluda y lista las pantallas que
 * llegan en las etapas siguientes, para que el shell sea navegable y verificable.
 */
export function RoleHome({ title, subtitle, upcoming }: RoleHomeProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 font-bold text-content">{title}</h2>
        <p className="text-body text-content-secondary">{subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {upcoming.map(({ icon: Icon, label, etapa }) => (
          <Card key={label} className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-surface-muted text-content-secondary">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-content">
                {label}
              </p>
              <p className="text-small text-content-muted">
                Próximamente · Etapa {etapa}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
