import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endpoints, http } from '@/api';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { paths } from '@/routes/paths';
import { PageActions, usePageChrome } from '@/components/layout';
import { Button, EmptyState, SkeletonCard } from '@/components/ui';
import type { SolicitudDeliveryResponse } from '@/types';
import { ErrorState, SolicitudCard, useToastOnError } from '../components';

// Solicitudes de delivery en estado BUSCANDO. El repartidor toma una y pasa a la entrega
// activa; si otro se le adelanto, el backend responde 422 y refrescamos la lista.
export default function Available() {
  usePageChrome('Solicitudes disponibles', {
    sub: 'Entregas en búsqueda cerca de ti',
    maxWidth: 760,
  });
  const navigate = useNavigate();
  const toast = useToast();
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const { data, loading, error, refetch } = useApi<SolicitudDeliveryResponse[]>(
    (signal) => http.get<SolicitudDeliveryResponse[]>(endpoints.repartidor.pedidosDisponibles, { signal }),
    [],
  );

  const aceptar = useAsyncAction((id: number) =>
    http.post<SolicitudDeliveryResponse>(endpoints.repartidor.aceptar(id)),
  );

  useToastOnError(aceptar.error, () => refetch());

  const onAceptar = (id: number) => {
    setAcceptingId(id);
    aceptar.run(id).then((result) => {
      setAcceptingId(null);
      if (result) {
        toast.success('Aceptaste la entrega. Recoge el pedido en el local.');
        navigate(`${paths.repartidor.activa}?id=${id}`);
      }
    });
  };

  return (
    <>
      <PageActions>
        <Button variant="secondary" size="sm" icon="refresh" onClick={refetch} disabled={loading}>
          Actualizar
        </Button>
      </PageActions>

      {loading ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <SkeletonCard photo={false} />
          <SkeletonCard photo={false} />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="bike"
          title="No hay entregas disponibles ahora"
          description="Te avisaremos cuando entre una solicitud cerca de ti. Mantente disponible."
          action={
            <Button variant="secondary" icon="refresh" onClick={refetch}>
              Actualizar
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {data.map((solicitud) => (
            <SolicitudCard
              key={solicitud.id}
              solicitud={solicitud}
              onAceptar={onAceptar}
              loading={aceptar.loading && acceptingId === solicitud.id}
              disabled={aceptar.loading}
            />
          ))}
        </div>
      )}
    </>
  );
}
