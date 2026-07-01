import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, normalizeError, type PageResponse } from '@/api';

type PageFetcher<T> = (page: number, size: number, signal: AbortSignal) => Promise<PageResponse<T>>;

export interface UseInfiniteListResult<T> {
  items: T[];
  loading: boolean; // primera página
  loadingMore: boolean; // páginas siguientes
  refreshing: boolean; // pull-to-refresh
  error: ApiError | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  prepend: (item: T) => void;
  patch: (match: (item: T) => boolean, update: (item: T) => T) => void;
}

// Paginación como scroll infinito, con el estado en el componente (no en la URL).
// prepend y patch dejan que las pantallas con SSE muevan la lista en vivo sin
// recargar. fetchPage debe venir memoizado por la pantalla (useCallback).
export function useInfiniteList<T>(fetchPage: PageFetcher<T>, size = 20): UseInfiniteListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const load = useCallback(
    async (targetPage: number, mode: 'initial' | 'more' | 'refresh') => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      if (mode === 'more') setLoadingMore(true);
      else if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetchPage(targetPage, size, controller.signal);
        if (controller.signal.aborted || !mountedRef.current) return;
        setItems((prev) => (targetPage === 0 ? res.content : [...prev, ...res.content]));
        setPage(res.page);
        setHasMore(res.page + 1 < res.totalPages);
      } catch (err) {
        if (!controller.signal.aborted && mountedRef.current) setError(normalizeError(err));
      } finally {
        if (!controller.signal.aborted && mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage, size],
  );

  useEffect(() => {
    load(0, 'initial');
  }, [load]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    load(page + 1, 'more');
  }, [load, loading, loadingMore, refreshing, hasMore, page]);

  const refresh = useCallback(() => {
    load(0, 'refresh');
  }, [load]);

  const prepend = useCallback((item: T) => setItems((prev) => [item, ...prev]), []);

  const patch = useCallback(
    (match: (item: T) => boolean, update: (item: T) => T) =>
      setItems((prev) => prev.map((it) => (match(it) ? update(it) : it))),
    [],
  );

  return { items, loading, loadingMore, refreshing, error, hasMore, loadMore, refresh, prepend, patch };
}
