import { cn } from '@/lib/cn';
import type { FranjaOcupacion, OcupacionResponse } from '@/types';

interface OccupancyChartProps {
  data: OcupacionResponse;
}

// hoy en la convencion del backend: 1 = lunes ... 7 = domingo
function diaSemanaHoy(): number {
  const js = new Date().getDay();
  return js === 0 ? 7 : js;
}

// Grafico de barras hora por hora de la ocupacion del local. Cada barra es una franja: la
// altura va con los minutos estimados de espera, la hora actual se resalta y las franjas
// sin datos suficientes quedan apagadas.
export function OccupancyChart({ data }: OccupancyChartProps) {
  const hoy = diaSemanaHoy();
  const delDia = data.franjas.filter((f) => f.diaSemana === hoy);
  const franjas: FranjaOcupacion[] = delDia.length > 0 ? delDia : data.franjas;
  const ordenadas = [...franjas].sort((a, b) => a.hora - b.hora);

  let maxMinutos = 1;
  for (const f of ordenadas) {
    if (f.minutosEstimados != null && f.minutosEstimados > maxMinutos) maxMinutos = f.minutosEstimados;
  }

  const horaActual = new Date().getHours();

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1" style={{ height: 200 }}>
      {ordenadas.map((f) => {
        const minutos = f.minutosEstimados ?? 0;
        const alturaPct = f.suficientesDatos ? Math.max(6, (minutos / maxMinutos) * 100) : 6;
        const esAhora = f.diaSemana === hoy && f.hora === horaActual;
        const titulo = f.suficientesDatos
          ? `${f.hora}:00 · ${minutos} min · ${f.pedidosTipicos ?? 0} pedidos`
          : `${f.hora}:00 · sin datos suficientes`;
        return (
          <div key={`${f.diaSemana}-${f.hora}`} className="flex min-w-[26px] flex-1 flex-col items-center gap-1">
            <div className="flex h-full w-full items-end" title={titulo}>
              <div
                className={cn(
                  'w-full rounded-t-[5px] transition-all',
                  !f.suficientesDatos
                    ? 'bg-line'
                    : esAhora
                      ? 'bg-brand-strong'
                      : 'bg-brand-soft',
                )}
                style={{ height: `${alturaPct}%` }}
              />
            </div>
            <span
              className={cn(
                'text-[10.5px] tabular-nums',
                esAhora ? 'font-bold text-brand-text' : 'text-ink-muted',
              )}
            >
              {f.hora}
            </span>
          </div>
        );
      })}
    </div>
  );
}
