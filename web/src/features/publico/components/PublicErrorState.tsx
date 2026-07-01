import type { ApiError } from '@/api';
import { Button, EmptyState } from '@/components/ui';

// Estado de error del área pública: muestra el mensaje real del backend y un botón para
// reintentar. Es el equivalente del ErrorState del cliente, replicado aquí para no depender
// de otra área.
export function PublicErrorState({
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
