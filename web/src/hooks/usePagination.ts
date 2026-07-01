import { useSearchParams } from 'react-router-dom';

interface UsePaginationOptions {
  defaultSize?: number;
}

// Mantiene la pagina y el tamano en los query params, asi el estado de la lista vive en
// la URL (se puede compartir y sobrevive al refresco). La UI trabaja con page 1-indexed;
// apiPage da el 0-indexed que espera el backend.
export function usePagination({ defaultSize = 10 }: UsePaginationOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const size = Number(searchParams.get('size')) || defaultSize;

  const setPage = (next: number) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('page', String(next));
        return params;
      },
      { replace: true },
    );
  };

  const setSize = (next: number) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('size', String(next));
        // al cambiar el tamano volvemos a la primera pagina para no quedar fuera de rango
        params.set('page', '1');
        return params;
      },
      { replace: true },
    );
  };

  return { page, size, apiPage: page - 1, setPage, setSize };
}
