import { useEffect, useState } from 'react';

// devuelve el valor recién cuando se queda quieto delayMs; lo usa el buscador para
// no pegarle al API en cada tecla
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
