import { Card, Chip, Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { FranjaOcupacion, OcupacionResponse } from '@/types';

// Dia de la semana de hoy en el formato del backend (1 = lunes ... 7 = domingo).
function isoDiaHoy(): number {
  const js = new Date().getDay();
  return js === 0 ? 7 : js;
}

// Barra de ocupacion hora por hora para el dia de hoy. La altura sale de los pedidos
// tipicos de cada franja y marcamos la hora actual.
export function OccupancyChart({ ocupacion }: { ocupacion: OcupacionResponse }) {
  const horaActual = new Date().getHours();
  const diaHoy = isoDiaHoy();
  const franjasHoy = ocupacion.franjas
    .filter((f) => f.diaSemana === diaHoy)
    .sort((a, b) => a.hora - b.hora);

  const valor = (f: FranjaOcupacion) => f.pedidosTipicos ?? 0;
  const maximo = franjasHoy.reduce((max, f) => Math.max(max, valor(f)), 0);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="ql-h3">Qué tan lleno está</h3>
        <Chip tone="info" size="sm" icon="clock">
          Ahora ~{ocupacion.minutosAhora} min
        </Chip>
      </div>

      {!ocupacion.hayDatosSuficientes || franjasHoy.length === 0 ? (
        <div className="flex items-center gap-2 text-small text-ink-soft">
          <Icon name="info" size={15} className="text-ink-muted" />
          {ocupacion.mensaje ?? 'Aún no hay datos suficientes para estimar la ocupación de hoy.'}
        </div>
      ) : (
        <div className="flex items-end gap-1" style={{ height: 92 }}>
          {franjasHoy.map((f) => {
            const ratio = maximo > 0 ? valor(f) / maximo : 0;
            const altura = Math.max(6, Math.round(ratio * 84));
            const esAhora = f.hora === horaActual;
            return (
              <div key={f.hora} className="flex flex-1 flex-col items-center gap-1">
                <div
                  title={`${f.hora}:00 · ${f.pedidosTipicos ?? 0} pedidos típicos`}
                  className={cn('w-full rounded-t-md', esAhora ? 'bg-brand-strong' : 'bg-brand-soft')}
                  style={{ height: altura }}
                />
                {f.hora % 3 === 0 && (
                  <span className={cn('text-[10px] tabular-nums', esAhora ? 'font-bold text-brand-text' : 'text-ink-muted')}>
                    {f.hora}h
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
