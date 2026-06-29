import { useEffect, useRef } from "react";
import { subscribeSse } from "@/lib/sse";

interface UseSseOptions<T> {
  /** Nombre del evento a escuchar (p. ej. 'pedido-estado'). */
  event?: string;
  onMessage: (data: T) => void;
  onError?: (error: unknown) => void;
  onOpen?: () => void;
  /** Si es false, no abre el stream (p. ej. sin sesión o pedido terminal). */
  enabled?: boolean;
}

/**
 * Suscribe a un stream SSE autenticado durante la vida del componente. Cierra el
 * stream al desmontar o cuando cambian `path`/`enabled` (MAPA §8.3/§8.5). Los
 * callbacks se leen por ref para no reabrir el stream en cada render.
 */
export function useSse<T>(path: string, options: UseSseOptions<T>): void {
  const { event, enabled = true } = options;
  const handlers = useRef(options);
  handlers.current = options;

  useEffect(() => {
    if (!enabled) return;
    const close = subscribeSse<T>(path, {
      event,
      onMessage: (data) => handlers.current.onMessage(data),
      onError: (err) => handlers.current.onError?.(err),
      onOpen: () => handlers.current.onOpen?.(),
    });
    return close;
  }, [path, event, enabled]);
}
