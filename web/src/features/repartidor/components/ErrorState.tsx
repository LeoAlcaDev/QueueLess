import type { ApiError } from '@/api';
import { Button, EmptyState } from '@/components/ui';

interface ErrorStateProps {
  error: ApiError;
  onRetry: () => void;
}

// Estado de error con boton de reintento, para cuando una carga falla. El mensaje sale del
// backend (en los 422 es el texto de cara al usuario).
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon="alertCircle"
      title="No pudimos cargar la información"
      description={error.message}
      action={
        <Button variant="secondary" icon="refresh" onClick={onRetry}>
          Reintentar
        </Button>
      }
    />
  );
}
