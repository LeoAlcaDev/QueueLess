import { cn } from "@/lib/cn";
import { WaitTimeBadge } from "@/components/ui";
import type { OcupacionResponse } from "@/types";

/** 1=lunes..7=domingo (alineado al backend); JS getDay() es 0=domingo. */
function hoyDiaSemana(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

/** Curva de ocupación por franja horaria del día de hoy (zona Lima, aprox). */
export function OcupacionCurva({
  ocupacion,
}: {
  ocupacion: OcupacionResponse;
}) {
  const dia = hoyDiaSemana();
  const horaActual = new Date().getHours();
  const franjas = ocupacion.franjas
    .filter((f) => f.diaSemana === dia)
    .sort((a, b) => a.hora - b.hora);
  const maxPedidos = Math.max(1, ...franjas.map((f) => f.pedidosTipicos ?? 0));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-small text-content-secondary">Ahora:</span>
        <WaitTimeBadge minutes={ocupacion.minutosAhora} />
      </div>

      {!ocupacion.hayDatosSuficientes || franjas.length === 0 ? (
        <p className="text-small text-content-muted">
          {ocupacion.mensaje ?? "Aún no hay suficientes datos de ocupación."}
        </p>
      ) : (
        <div className="flex items-end gap-1" aria-hidden="true">
          {franjas.map((f) => {
            const altura = f.suficientesDatos
              ? ((f.pedidosTipicos ?? 0) / maxPedidos) * 100
              : 0;
            const esAhora = f.hora === horaActual;
            return (
              <div
                key={f.hora}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className="flex h-20 w-full items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-[4px]",
                      esAhora ? "bg-brand-strong" : "bg-brand-soft",
                    )}
                    style={{ height: `${Math.max(altura, 4)}%` }}
                  />
                </div>
                {f.hora % 3 === 0 && (
                  <span className="text-[10px] text-content-muted">
                    {f.hora}h
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
