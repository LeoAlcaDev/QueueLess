import { useState, type ReactNode } from 'react';
import { http, endpoints } from '@/api';
import { useAsyncAction } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Icon, StateBanner } from '@/components/ui';
import { cn } from '@/lib/cn';
import type {
  AsistenteRequest,
  AsistenteResponse,
  RecomendacionItem,
  RolConversacion,
  TurnoConversacion,
} from '@/types';
import { RecommendationCard } from '../components';

interface ChatMsg {
  rol: RolConversacion;
  texto: string;
  recomendaciones?: RecomendacionItem[];
}

const SUGERENCIAS = ['Algo sin gluten y barato', 'Quiero algo vegano', 'Lo más rápido ahora', 'Algo bajo S/ 18'];
const INTRO = 'Hola. Dime qué se te antoja y te recomiendo platos seguros para tu perfil y dentro de tu presupuesto.';

export default function Assistant() {
  usePageChrome('Asistente de IA', { sub: 'Recomienda platos seguros para tu perfil', maxWidth: 760 });

  const [mensajes, setMensajes] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  // guardamos el último aviso de modo degradado para mostrarlo bajo la conversación
  const [aviso, setAviso] = useState<string | null>(null);

  const preguntar = useAsyncAction((body: AsistenteRequest) =>
    http.post<AsistenteResponse>(endpoints.cliente.asistente, body),
  );

  const enviar = async (texto: string) => {
    const limpio = texto.trim();
    if (!limpio || preguntar.loading) return;

    // el historial que mandamos es la conversación previa, sin el turno nuevo
    const historial: TurnoConversacion[] = mensajes.map((m) => ({ rol: m.rol, texto: m.texto }));
    setMensajes((prev) => [...prev, { rol: 'USUARIO', texto: limpio }]);
    setInput('');

    const res = await preguntar.run({ mensaje: limpio, historial });
    if (!res) return;

    setAviso(res.asistenteDisponible ? null : res.aviso);
    const respuesta = res.explicacion ?? res.aviso ?? 'Te dejo algunas opciones.';
    setMensajes((prev) => [...prev, { rol: 'ASISTENTE', texto: respuesta, recomendaciones: res.recomendaciones }]);
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3.5 pb-4">
        <Bubble who="bot">{INTRO}</Bubble>

        {mensajes.map((msg, index) =>
          msg.rol === 'USUARIO' ? (
            <Bubble key={index} who="user">
              {msg.texto}
            </Bubble>
          ) : (
            <div key={index} className="flex flex-col gap-3">
              <Bubble who="bot">{msg.texto}</Bubble>
              {msg.recomendaciones && msg.recomendaciones.length > 0 && (
                <div className="grid grid-cols-1 gap-3 pl-10 sm:grid-cols-2">
                  {msg.recomendaciones.map((rec) => (
                    <RecommendationCard key={`${rec.puntoDeVentaId}-${rec.productoId}`} rec={rec} />
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {aviso && (
          <div className="pl-10">
            <StateBanner tone="warning" icon="bot" title="Asistente con disponibilidad reducida">
              {aviso}
            </StateBanner>
          </div>
        )}

        {preguntar.loading && (
          <Bubble who="bot">
            <TypingDots />
          </Bubble>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2.5 bg-page px-4 pb-1 pt-3 lg:-mx-8 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              className="shrink-0 whitespace-nowrap rounded-pill border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:bg-surface-muted"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                enviar(input);
              }
            }}
            placeholder="Escribe qué se te antoja…"
            className="h-12 min-w-0 flex-1 rounded-input border border-line bg-surface px-3.5 text-[15px] text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:shadow-focus"
          />
          <button
            type="button"
            disabled={!input.trim() || preguntar.loading}
            onClick={() => enviar(input)}
            aria-label="Enviar"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-button bg-brand-strong text-on-brand transition duration-150 ease-quart active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="send" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ who, children }: { who: 'bot' | 'user'; children: ReactNode }) {
  const me = who === 'user';
  return (
    <div className={cn('flex items-end gap-2.5', me ? 'flex-row-reverse' : 'flex-row')}>
      {!me && (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-points text-on-brand">
          <Icon name="sparkles" size={15} />
        </span>
      )}
      <div
        className={cn(
          'max-w-[82%] rounded-card px-3.5 py-2.5 text-small leading-snug',
          me ? 'rounded-br-[4px] bg-brand-strong text-on-brand' : 'rounded-bl-[4px] bg-surface-muted text-ink',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
