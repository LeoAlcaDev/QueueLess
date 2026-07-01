import { useEffect, useState } from 'react';

// Devuelve el valor con un retraso: util para la busqueda, que solo dispara el request
// cuando el usuario deja de tipear por un momento.
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
