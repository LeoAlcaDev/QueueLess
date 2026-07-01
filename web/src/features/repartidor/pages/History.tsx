import { useNavigate } from 'react-router-dom';
import { endpoints, http, type PageResponse } from '@/api';
import { useApi, usePagination } from '@/hooks';
import { paths } from '@/routes/paths';
import { usePageChrome } from '@/components/layout';
import { Button, EmptyState, Pagination, SkeletonCard } from '@/components/ui';
import type { SolicitudDeliveryResponse } from '@/types';
import { EntregaCard, ErrorState } from '../components';

// Historial paginado de las solicitudes que tomo el repartidor. El backend pagina 0-indexed
// (apiPage); la UI y el componente Pagination trabajan con page 1-indexed.
export default function History() {
  usePageChrome('Mis entregas', {
    sub: 'Historial de las solicitudes que tomaste',
    maxWidth: 720,
  });
  const navigate = useNavigate();
  const { page, size, apiPage, setPage, setSize } = usePagination({ defaultSize: 10 });

  const { data, loading, error, refetch } = useApi<PageResponse<SolicitudDeliveryResponse>>(
    (signal) =>
      http.getPage<SolicitudDeliveryResponse>(endpoints.repartidor.misEntregas, {
        params: { page: apiPage, size },
        signal,
      }),
    [apiPage, size],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonCard photo={false} />
        <SkeletonCard photo={false} />
        <SkeletonCard photo={false} />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (!data || data.content.length === 0) {
    return (
      <EmptyState
        icon="package"
        title="Aún no tienes entregas"
        description="Cuando completes tu primera entrega comunitaria aparecerá aquí."
        action={<Button onClick={() => navigate(paths.repartidor.solicitudes)}>Ver solicitudes</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {data.content.map((solicitud) => (
          <EntregaCard key={solicitud.id} solicitud={solicitud} />
        ))}
      </div>
      <Pagination page={page} size={size} total={data.totalElements} onPage={setPage} onSize={setSize} />
    </div>
  );
}
