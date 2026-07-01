import { useEffect, useRef, useState } from 'react';
import { apiBaseUrl, authBridge, forceRefresh } from '@/api';

interface UseEventStreamOptions<E> {
  enabled?: boolean;
  parse?: (raw: string) => E;
  onEvent: (event: E) => void;
  onError?: (err: unknown) => void;
}

// Lector SSE sobre XMLHttpRequest. En React Native el fetch no expone el body como
// stream, así que @microsoft/fetch-event-source no corre; XHR sí entrega el texto
// incremental por onreadystatechange y deja setear el header Authorization (el
// backend exige el token en el header, no por query). Reconecta con backoff ante
// cualquier corte (incluido el timeout del server), sin depender de su valor.
export function useEventStream<E = unknown>(path: string, options: UseEventStreamOptions<E>): { connected: boolean } {
  const { enabled = true, parse, onEvent, onError } = options;
  const [connected, setConnected] = useState(false);

  // callbacks en refs para no reabrir el stream en cada render
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  const parseRef = useRef(parse);
  onEventRef.current = onEvent;
  onErrorRef.current = onError;
  parseRef.current = parse;

  useEffect(() => {
    if (!enabled) return;

    let xhr: XMLHttpRequest | null = null;
    let cancelled = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let consumed = 0;
    let buffer = '';

    const emitBlock = (block: string) => {
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (!data) return;
      try {
        const event = parseRef.current ? parseRef.current(data) : (JSON.parse(data) as E);
        onEventRef.current(event);
      } catch (err) {
        onErrorRef.current?.(err);
      }
    };

    const consume = (chunk: string) => {
      buffer += chunk;
      // los eventos SSE se separan por una línea en blanco
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';
      for (const block of blocks) emitBlock(block);
    };

    const cleanupXhr = () => {
      if (xhr) {
        xhr.onreadystatechange = null;
        xhr.onerror = null;
        xhr = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      setConnected(false);
      cleanupXhr();
      const delay = Math.min(1000 * 2 ** retry, 15000);
      retry += 1;
      timer = setTimeout(() => {
        if (!cancelled) connect();
      }, delay);
    };

    const connect = async () => {
      const token = await authBridge.getAccessToken();
      if (cancelled) return;
      consumed = 0;
      buffer = '';
      const request = new XMLHttpRequest();
      xhr = request;
      request.open('GET', `${apiBaseUrl}${path}`);
      request.setRequestHeader('Accept', 'text/event-stream');
      if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);

      request.onreadystatechange = () => {
        if (xhr !== request) return;
        if (request.readyState >= 3 && request.status === 200) {
          setConnected(true);
          retry = 0;
          const fresh = request.responseText.slice(consumed);
          consumed = request.responseText.length;
          if (fresh) consume(fresh);
        }
        if (request.readyState === 4) {
          // un 401/403 acá suele ser token vencido: refrescamos una vez y reconectamos
          if (request.status === 401 || request.status === 403) {
            forceRefresh().finally(scheduleReconnect);
          } else {
            scheduleReconnect();
          }
        }
      };
      request.onerror = scheduleReconnect;
      request.send();
    };

    connect();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (xhr) {
        xhr.onreadystatechange = null;
        xhr.onerror = null;
        xhr.abort();
        xhr = null;
      }
      setConnected(false);
    };
  }, [enabled, path]);

  return { connected };
}
