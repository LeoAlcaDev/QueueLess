import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { ApiError, normalizeError } from '@/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => void;
}

// Ejecuta un fetcher que recibe un AbortSignal y maneja carga, error y cancelacion. Se
// re-ejecuta cuando cambian las deps; al desmontar o cambiar deps aborta el request
// anterior, asi no seteamos estado de una respuesta que ya no nos importa.
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList = [],
): UseApiResult<T> {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: true, error: null });
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        const apiError = normalizeError(err);
        if (apiError.kind === 'canceled' || controller.signal.aborted) return;
        setState({ data: null, loading: false, error: apiError });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, refetch };
}

// Envuelve una accion (un submit, un POST) en estado de carga y error tipado. El flag
// loading sirve para deshabilitar el boton y evitar el doble submit; el run nunca lanza,
// devuelve undefined si fallo y deja el error en el hook.
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    setLoading(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (err) {
      setError(normalizeError(err));
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);
  return { run, loading, error, reset };
}
