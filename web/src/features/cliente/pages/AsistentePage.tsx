import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bot, Clock, Info, Send } from "lucide-react";
import { asistenteApi } from "@/api";
import { Button, Card, Spinner, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { userFacingMessage } from "@/lib/errors";
import { formatMinutes, formatSoles } from "@/lib/format";
import type { RecomendacionItem, TurnoConversacion } from "@/types";

interface ChatTurn {
  rol: "USUARIO" | "ASISTENTE";
  texto: string;
  aviso?: string | null;
  recomendaciones?: RecomendacionItem[];
}

/**
 * Asistente / chat (POST /cliente/asistente). **Siempre 200**: si la IA no está
 * disponible, mostramos el `aviso` y la lista segura igual (MAPA §7.2).
 */
export default function AsistentePage() {
  const toast = useToast();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const mensaje = input.trim();
    if (!mensaje || sending) return;

    const historial: TurnoConversacion[] = turns.map((t) => ({
      rol: t.rol,
      texto: t.texto,
    }));
    setTurns((prev) => [...prev, { rol: "USUARIO", texto: mensaje }]);
    setInput("");
    setSending(true);
    try {
      const resp = await asistenteApi.preguntarAsistente({
        mensaje,
        historial,
      });
      setTurns((prev) => [
        ...prev,
        {
          rol: "ASISTENTE",
          texto:
            resp.explicacion ??
            (resp.asistenteDisponible ? "Aquí tienes algunas opciones:" : ""),
          aviso: resp.asistenteDisponible
            ? null
            : (resp.aviso ?? "El asistente no está disponible ahora."),
          recomendaciones: resp.recomendaciones,
        },
      ]);
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setSending(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4">
      {turns.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-pill bg-brand-soft text-content-brand">
            <Bot size={24} aria-hidden="true" />
          </span>
          <h2 className="text-h3 font-semibold text-content">
            ¿Qué se te antoja?
          </h2>
          <p className="max-w-xs text-small text-content-secondary">
            Cuéntame qué tienes ganas de comer, tu presupuesto o restricciones,
            y te recomiendo opciones.
          </p>
        </Card>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          {turns.map((t, i) =>
            t.rol === "USUARIO" ? (
              <p
                key={i}
                className="max-w-[85%] self-end rounded-card rounded-br-sm bg-brand-strong px-3.5 py-2.5 text-body text-onbrand"
              >
                {t.texto}
              </p>
            ) : (
              <div
                key={i}
                className="flex max-w-[90%] flex-col gap-2 self-start"
              >
                {t.texto && (
                  <p className="rounded-card rounded-bl-sm bg-surface-muted px-3.5 py-2.5 text-body text-content">
                    {t.texto}
                  </p>
                )}
                {t.aviso && (
                  <p className="flex items-start gap-2 rounded-card border border-warning-dot bg-warning-bg p-3 text-small text-warning-fg">
                    <Info
                      size={15}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    {t.aviso}
                  </p>
                )}
                {t.recomendaciones && t.recomendaciones.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {t.recomendaciones.map((r) => (
                      <RecomendacionCard
                        key={`${r.productoId}-${r.puntoDeVentaId}`}
                        item={r}
                      />
                    ))}
                  </div>
                ) : (
                  t.recomendaciones && (
                    <p className="text-small text-content-muted">
                      No encontré opciones que cumplan tu perfil.
                    </p>
                  )
                )}
              </div>
            ),
          )}
          {sending && (
            <div className="self-start">
              <Spinner size={18} />
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      )}

      <form
        onSubmit={enviar}
        className="sticky bottom-20 flex gap-2 bg-page py-1 lg:bottom-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej. algo sin gluten, menos de S/ 20"
          aria-label="Mensaje para el asistente"
          className={cn(
            "h-12 flex-1 rounded-input border border-line bg-surface px-3.5 text-body text-content",
            "placeholder:text-content-muted focus-visible:shadow-focus focus-visible:outline-none",
          )}
        />
        <Button type="submit" loading={sending} aria-label="Enviar">
          <Send size={18} aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}

function RecomendacionCard({ item }: { item: RecomendacionItem }) {
  return (
    <Link
      to={`/cliente/locales/${item.puntoDeVentaId}`}
      className="rounded-card focus-visible:shadow-focus focus-visible:outline-none"
    >
      <Card className="flex flex-col gap-1 hover:bg-surface-muted">
        <div className="flex items-start justify-between gap-2">
          <span className="text-body font-semibold text-content">
            {item.nombre}
          </span>
          <span className="shrink-0 text-body font-semibold text-content">
            {formatSoles(item.precio)}
          </span>
        </div>
        {item.descripcion && (
          <p className="line-clamp-2 text-small text-content-secondary">
            {item.descripcion}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-small text-content-muted">
          <span>{item.puntoDeVentaNombre}</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={13} aria-hidden="true" />
            {formatMinutes(item.minutosEstimados, true)}
          </span>
          {!item.dentroDePresupuesto && (
            <span className="text-warning-fg">Sobre tu presupuesto</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
