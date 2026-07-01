import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endpoints, http } from '@/api';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { Button, ConfirmDialog, EmptyState, Select, SkeletonCard } from '@/components/ui';
import { usePageChrome, PageActions } from '@/components/layout';
import { paths } from '@/routes/paths';
import type { ProductoResponse } from '@/types';
import { useStores } from '../hooks';
import { ProductCard } from '../components/ProductCard';

// Catalogo de productos por local. Primero se elige el local (el listado del backend exige
// el puntoDeVentaId) y luego se gestiona cada producto: disponibilidad, edicion y borrado.
export default function Products() {
  const navigate = useNavigate();
  const toast = useToast();
  const stores = useStores();

  const [storeId, setStoreId] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [target, setTarget] = useState<ProductoResponse | null>(null);

  // al cargar los locales, seleccionamos el primero por defecto
  useEffect(() => {
    if (!storeId && stores.data && stores.data.length > 0) {
      setStoreId(String(stores.data[0].id));
    }
  }, [stores.data, storeId]);

  // el subtitulo de la topbar es el local elegido, para no perder el contexto de la carta
  const localActual = stores.data?.find((s) => String(s.id) === storeId)?.nombre;
  usePageChrome('Productos', { sub: localActual ?? 'Tu carta por local' });

  const products = useApi<ProductoResponse[]>(
    (signal) =>
      storeId
        ? http.get(endpoints.comercio.productos.base, { signal, params: { puntoDeVentaId: storeId } })
        : Promise.resolve([]),
    [storeId],
  );

  const toggle = useAsyncAction(async (producto: ProductoResponse, disponible: boolean) => {
    await http.patch(endpoints.comercio.productos.disponibilidad(producto.id), { disponible });
    toast.success(disponible ? 'Producto disponible' : 'Producto oculto');
    products.refetch();
  });

  const del = useAsyncAction(async (producto: ProductoResponse) => {
    await http.delete(endpoints.comercio.productos.detail(producto.id));
    toast.success('Producto eliminado');
    setTarget(null);
    products.refetch();
  });

  useEffect(() => {
    if (toggle.error) toast.error(toggle.error.message);
  }, [toggle.error, toast]);
  useEffect(() => {
    if (del.error) toast.error(del.error.message);
  }, [del.error, toast]);

  if (stores.loading && !stores.data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (stores.error) {
    return (
      <EmptyState
        icon="store"
        title="No pudimos cargar tus locales"
        description={stores.error.message}
        action={
          <Button icon="refresh" onClick={stores.refetch}>
            Reintentar
          </Button>
        }
      />
    );
  }

  // sin locales no hay donde colgar productos
  if ((stores.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon="store"
        title="Primero crea un local"
        description="Los productos pertenecen a un punto de venta."
        action={
          <Button icon="plus" onClick={() => navigate(paths.comercio.localNuevo)}>
            Crear local
          </Button>
        }
      />
    );
  }

  const storeOptions = (stores.data ?? []).map((s) => ({ value: String(s.id), label: s.nombre }));
  const lista = products.data ?? [];

  const nuevo = (
    <Button
      icon="plus"
      size="sm"
      disabled={!storeId}
      onClick={() => navigate(paths.comercio.productoNuevo, { state: { puntoDeVentaId: Number(storeId) } })}
    >
      Nuevo producto
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageActions>{nuevo}</PageActions>

      <div className="max-w-xs">
        <Select
          label="Local"
          options={storeOptions}
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        />
      </div>

      {!storeId || (products.loading && !products.data) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : products.error ? (
        <EmptyState
          icon="bag"
          title="No pudimos cargar los productos"
          description={products.error.message}
          action={
            <Button icon="refresh" onClick={products.refetch}>
              Reintentar
            </Button>
          }
        />
      ) : lista.length === 0 ? (
        <EmptyState
          icon="bag"
          title="Este local no tiene productos"
          description="Usa “Nuevo producto” para agregar el primero a la carta."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lista.map((producto) => (
            <ProductCard
              key={producto.id}
              producto={producto}
              toggling={toggle.loading && pendingId === producto.id}
              onToggle={(disponible) => {
                setPendingId(producto.id);
                toggle.run(producto, disponible);
              }}
              onEdit={() => navigate(paths.comercio.productoEdit(producto.id), { state: { producto } })}
              onDelete={() => setTarget(producto)}
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
        title="Eliminar producto"
        description={target ? `Se eliminará “${target.nombre}”. Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
      />
    </div>
  );
}
