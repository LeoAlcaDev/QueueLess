import { useCallback, useEffect, useRef, useState } from "react";

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  /** Error normalizado (ApiError) de la última carga, o null. */
  error: unknown;
  /** Vuelve a ejecutar la carga (descarta resultados en vuelo previos). */
  refetch: () => void;
  /** Permite mutar el dato en memoria (p. ej. tras una acción optimista). */
  setData: (next: T | null) => void;
}

/**
 * Carga de datos genérica con loading/error/refetch. La función de carga se pasa
 * estable (envuelta por el caller en useCallback) o se controla con `deps`.
 * Ignora respuestas de cargas obsoletas para evitar carreras al cambiar de ruta.
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const reqId = useRef(0);

  const run = useCallback(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (id === reqId.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (id === reqId.current) {
          setError(err);
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      // Invalida la carga en vuelo al desmontar/recargar.
      reqId.current++;
    };
  }, [run]);

  return { data, loading, error, refetch: run, setData };
}
