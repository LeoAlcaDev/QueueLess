import type { ApiError } from '@/api';
import { Button, EmptyState } from '@/components/ui';

// Estado de error reutilizable: muestra el mensaje real del backend y un boton para
// reintentar la carga. Lo usan todas las pantallas que cargan con useApi.
export function ErrorState({
  error,
  onRetry,
  title = 'No pudimos cargar esto',
}: {
  error: ApiError;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <EmptyState
      icon="alertCircle"
      title={title}
      description={error.message}
      action={
        <Button icon="refresh" variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      }
    />
  );
}
