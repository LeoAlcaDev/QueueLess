import { useCallback, useEffect, useRef, useState } from "react";
import type { Page, PageParams } from "@/types";

export interface UsePaginatedResult<T> {
  items: T[];
  loading: boolean;
  error: unknown;
  /** Hay más páginas por cargar. */
  hasMore: boolean;
  totalElements: number;
  /** Carga la siguiente página y la anexa. */
  loadMore: () => void;
  /** Reinicia a la primera página (descarta lo acumulado). */
  reload: () => void;
}

/**
 * Lista paginada con "cargar más" (anexa páginas). Pensado para listados Spring
 * (`Page<T>`): mis pedidos, movimientos de puntos, etc.
 */
export function usePaginated<T>(
  fetchPage: (params: PageParams) => Promise<Page<T>>,
  options: { size?: number; sort?: string; deps?: unknown[] } = {},
): UsePaginatedResult<T> {
  const { size = 10, sort, deps = [] } = options;
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const reqId = useRef(0);

  const load = useCallback(
    (nextPage: number) => {
      const id = ++reqId.current;
      setLoading(true);
      setError(null);
      fetchPage({ page: nextPage, size, sort })
        .then((res) => {
          if (id !== reqId.current) return;
          setItems((prev) =>
            nextPage === 0 ? res.content : [...prev, ...res.content],
          );
          setPage(res.page);
          setTotalPages(res.totalPages);
          setTotalElements(res.totalElements);
          setLoading(false);
        })
        .catch((err) => {
          if (id !== reqId.current) return;
          setError(err);
          setLoading(false);
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size, sort, ...deps],
  );

  useEffect(() => {
    load(0);
    return () => {
      reqId.current++;
    };
  }, [load]);

  const loadMore = useCallback(() => {
    if (!loading && page + 1 < totalPages) load(page + 1);
  }, [loading, page, totalPages, load]);

  const reload = useCallback(() => load(0), [load]);

  return {
    items,
    loading,
    error,
    hasMore: page + 1 < totalPages,
    totalElements,
    loadMore,
    reload,
  };
}
