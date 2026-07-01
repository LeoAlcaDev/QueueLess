import { useEffect, useRef, useState } from 'react';
import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source';
import { getValidAccessToken } from '@/api';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://queueless-prod-alb-1673624815.us-east-1.elb.amazonaws.com/api';

export type StreamStatus = 'idle' | 'open' | 'error';

interface UseEventStreamOptions {
  // nombre del evento del backend que nos interesa (p. ej. 'pedido-estado')
  event?: string;
  onMessage: (data: unknown, raw: EventSourceMessage) => void;
  enabled?: boolean;
}

// error con el que cortamos los reintentos cuando el fallo no es transitorio (auth)
class FatalStreamError extends Error {}

// Abre un stream SSE mandando el Bearer por header: EventSource nativo no puede, por eso
// usamos fetch-event-source. Reconecta solo ante caidas transitorias y corta de raiz si
// el server responde 401/403. Se cierra al desmontar via AbortController.
export function useEventStream(
  path: string,
  { event, onMessage, enabled = true }: UseEventStreamOptions,
): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    async function open() {
      const token = await getValidAccessToken();
      await fetchEventSource(`${baseURL}${path}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token ?? ''}` },
        openWhenHidden: true,
        onopen: async (response) => {
          const contentType = response.headers.get('content-type') ?? '';
          if (response.ok && contentType.includes('text/event-stream')) {
            setStatus('open');
            return;
          }
          throw new FatalStreamError(`SSE respondio ${response.status}`);
        },
        onmessage: (msg) => {
          if (event && msg.event !== event) return;
          if (!msg.data) return;
          let parsed: unknown = msg.data;
          try {
            parsed = JSON.parse(msg.data);
          } catch {
            // si no es JSON, dejamos el texto crudo
          }
          onMessageRef.current(parsed, msg);
        },
        onerror: (err) => {
          setStatus('error');
          // un fallo de auth no se reintenta; el resto si, con el backoff de la libreria
          if (err instanceof FatalStreamError) throw err;
        },
      });
    }

    open().catch(() => {
      // el abort al desmontar y los errores fatales caen aca; no hay nada que hacer
    });

    return () => controller.abort();
  }, [path, event, enabled]);

  return status;
}
