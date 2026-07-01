import { useEffect, useState } from 'react';
import { endpoints, http } from '@/api';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { Button, EmptyState, SkeletonCard, StateBanner } from '@/components/ui';
import { usePageChrome } from '@/components/layout';
import type { ReclamoResponse } from '@/types';
import { ClaimCard } from '../components/ClaimCard';
import { RespondClaimModal } from '../components/RespondClaimModal';

// Reclamos y quejas recibidos por el comercio. Hoy la coordinacion se hace por correo, fuera
// de la app; igual conservamos la respuesta dentro de la app, que sigue funcionando contra el
// backend (rechaza con un 422 si el reclamo ya estaba respondido y mostramos ese mensaje).
export default function Claims() {
  usePageChrome('Reclamos recibidos', { sub: 'Contra tus locales' });
  const toast = useToast();
  const { data, loading, error, refetch } = useApi<ReclamoResponse[]>(
    (signal) => http.get(endpoints.comercio.reclamos.list, { signal }),
    [],
  );

  const [target, setTarget] = useState<ReclamoResponse | null>(null);

  const responder = useAsyncAction(async (reclamo: ReclamoResponse, respuesta: string) => {
    await http.post(endpoints.comercio.reclamos.responder(reclamo.id), { respuesta });
    toast.success('Respuesta enviada');
    setTarget(null);
    refetch();
  });

  useEffect(() => {
    if (responder.error) toast.error(responder.error.message);
  }, [responder.error, toast]);

  const reclamos = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {loading && !data ? (
        <div className="flex flex-col gap-4">
          <SkeletonCard photo={false} />
          <SkeletonCard photo={false} />
        </div>
      ) : error ? (
        <EmptyState
          icon="messageCircle"
          title="No pudimos cargar los reclamos"
          description={error.message}
          action={
            <Button icon="refresh" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : reclamos.length === 0 ? (
        <EmptyState
          icon="checkCircle"
          title="No tienes reclamos"
          description="Cuando un cliente registre un reclamo o queja aparecerá aquí con su plazo de respuesta."
        />
      ) : (
        <>
          <StateBanner tone="info" title="Las respuestas se coordinan por correo">
            Por ahora respondemos los reclamos por correo, fuera de la app. Escríbele al cliente al correo registrado;
            también puedes dejar tu respuesta aquí.
          </StateBanner>
          {reclamos.map((reclamo) => (
            <ClaimCard key={reclamo.id} reclamo={reclamo} onResponder={() => setTarget(reclamo)} />
          ))}
        </>
      )}

      <RespondClaimModal
        reclamo={target}
        onClose={() => setTarget(null)}
        loading={responder.loading}
        onConfirm={(respuesta) => target && responder.run(target, respuesta)}
      />
    </div>
  );
}
