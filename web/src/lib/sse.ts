import { fetchEventSource } from "@microsoft/fetch-event-source";
import { API_URL } from "@/api/client";
import { getAccessToken } from "./storage";

// SSE con header Authorization. El EventSource nativo no manda headers y la
// sesión es stateless (sin cookie), así que los streams exigen Bearer y hay que
// usar este polyfill basado en fetch (MAPA-FRONTEND §8.3).

export interface SseOptions<T> {
  /** Nombre del evento a escuchar (p. ej. 'pedido-estado'). */
  event?: string;
  /** Se invoca con el payload parseado de cada evento. */
  onMessage: (data: T) => void;
  /** Error de conexión/parseo (no fatal: el stream reintenta solo). */
  onError?: (error: unknown) => void;
  /** Se abrió la conexión correctamente. */
  onOpen?: () => void;
}

/**
 * Abre un stream SSE autenticado. Devuelve una función para cerrarlo: hay que
 * llamarla al desmontar la pantalla (el stream del backend no auto-cierra).
 */
export function subscribeSse<T>(
  path: string,
  options: SseOptions<T>,
): () => void {
  const controller = new AbortController();
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  void fetchEventSource(url, {
    signal: controller.signal,
    headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
    openWhenHidden: true,
    async onopen(response) {
      if (
        response.ok &&
        response.headers.get("content-type")?.includes("text/event-stream")
      ) {
        options.onOpen?.();
        return;
      }
      // 401/403/otros: error de apertura; lo reporta onError y se aborta.
      options.onError?.(new Error(`SSE abrió con status ${response.status}`));
      controller.abort();
    },
    onmessage(ev) {
      if (options.event && ev.event !== options.event) return;
      if (!ev.data) return;
      try {
        options.onMessage(JSON.parse(ev.data) as T);
      } catch (e) {
        options.onError?.(e);
      }
    },
    onerror(err) {
      // Si no lanzamos, la librería reintenta con backoff. Solo notificamos.
      options.onError?.(err);
    },
  });

  return () => controller.abort();
}
