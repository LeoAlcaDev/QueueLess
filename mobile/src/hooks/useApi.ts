import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, normalizeError } from '@/api';

type Requester<TArgs extends unknown[], T> = (signal: AbortSignal, ...args: TArgs) => Promise<T>;

export interface UseApiResult<TArgs extends unknown[], T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  run: (...args: TArgs) => Promise<T>;
  reset: () => void;
}

// Envuelve una llamada al API con loading/error/data y un AbortController propio:
// aborta al desmontar y al iniciar otra llamada, así no seteamos estado tarde. run
// guarda el error en el hook y además lo lanza, para que un formulario lo atrape y
// lea fieldErrors; las pantallas de carga simple pueden ignorar el throw.
export function useApi<TArgs extends unknown[], T>(requester: Requester<TArgs, T>): UseApiResult<TArgs, T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (...args: TArgs): Promise<T> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const result = await requester(controller.signal, ...args);
        if (!controller.signal.aborted && mountedRef.current) {
          setData(result);
          setLoading(false);
        }
        return result;
      } catch (err) {
        const apiError = normalizeError(err);
        if (!controller.signal.aborted && mountedRef.current) {
          setError(apiError);
          setLoading(false);
        }
        throw apiError;
      }
    },
    [requester],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, run, reset };
}
