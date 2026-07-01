import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endpoints, http } from '@/api';
import { useAsyncAction, useToast } from '@/hooks';
import { Button, ConfirmDialog, EmptyState, SkeletonCard } from '@/components/ui';
import { usePageChrome, PageActions } from '@/components/layout';
import { paths } from '@/routes/paths';
import type { PuntoDeVentaResponse } from '@/types';
import { useStores } from '../hooks';
import { StoreCard } from '../components/StoreCard';

// Locales del comercio: listar, abrir/cerrar, crear, editar y eliminar. El borrado pide
// confirmacion y respeta el mensaje del backend cuando el local tiene dependencias.
export default function Stores() {
  usePageChrome('Locales', { sub: 'Gestiona tus puntos de venta' });
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, refetch } = useStores();

  const [pendingId, setPendingId] = useState<number | null>(null);
  const [target, setTarget] = useState<PuntoDeVentaResponse | null>(null);

  const toggle = useAsyncAction(async (local: PuntoDeVentaResponse, abierto: boolean) => {
    await http.patch(endpoints.comercio.puntosDeVenta.estado(local.id), { abierto });
    toast.success(abierto ? 'Local abierto' : 'Local cerrado');
    refetch();
  });

  const del = useAsyncAction(async (local: PuntoDeVentaResponse) => {
    await http.delete(endpoints.comercio.puntosDeVenta.detail(local.id));
    toast.success('Local eliminado');
    setTarget(null);
    refetch();
  });

  useEffect(() => {
    if (toggle.error) toast.error(toggle.error.message);
  }, [toggle.error, toast]);
  useEffect(() => {
    if (del.error) toast.error(del.error.message);
  }, [del.error, toast]);

  const nuevo = (
    <Button icon="plus" size="sm" onClick={() => navigate(paths.comercio.localNuevo)}>
      Nuevo local
    </Button>
  );

  const locales = data ?? [];

  return (
    <div>
      {locales.length > 0 && <PageActions>{nuevo}</PageActions>}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard photo={false} />
          <SkeletonCard photo={false} />
        </div>
      ) : error ? (
        <EmptyState
          icon="store"
          title="No pudimos cargar tus locales"
          description={error.message}
          action={
            <Button icon="refresh" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : locales.length === 0 ? (
        <EmptyState
          icon="store"
          title="Aún no tienes locales"
          description="Crea tu primer punto de venta para empezar a recibir pedidos."
          action={
            <Button icon="plus" onClick={() => navigate(paths.comercio.localNuevo)}>
              Crear local
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locales.map((local) => (
            <StoreCard
              key={local.id}
              local={local}
              toggling={toggle.loading && pendingId === local.id}
              onToggle={(abierto) => {
                setPendingId(local.id);
                toggle.run(local, abierto);
              }}
              onEdit={() => navigate(paths.comercio.localEdit(local.id))}
              onDelete={() => setTarget(local)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={() => target && del.run(target)}
        loading={del.loading}
        destructive
        title="Eliminar local"
        description={target ? `Se eliminará “${target.nombre}”. Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
