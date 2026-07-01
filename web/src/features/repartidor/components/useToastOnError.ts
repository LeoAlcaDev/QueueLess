import { useEffect, useRef } from 'react';
import type { ApiError } from '@/api';
import { useToast } from '@/hooks';

// Cuando una accion guarda un error, lo mostramos como toast una sola vez. El callback
// opcional permite reaccionar ademas (refrescar la lista, marcar un campo del formulario).
// Leemos el error desde el estado del hook porque useAsyncAction.run no lo expone al
// terminar; recien aparece en el siguiente render.
export function useToastOnError(error: ApiError | null, onError?: (error: ApiError) => void) {
  const toast = useToast();
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!error) return;
    toast.error(error.message);
    onErrorRef.current?.(error);
  }, [error, toast]);
}
