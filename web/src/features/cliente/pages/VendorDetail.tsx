import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http, endpoints } from '@/api';
import { useApi, usePagination } from '@/hooks';
import { usePageChrome, PageActions } from '@/components/layout';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Icon,
  Pagination,
  Skeleton,
  StateBanner,
  Stars,
  WaitTimeBadge,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import { OBJETIVO_RESENA_LABELS } from '@/types';
import type { OcupacionResponse, ProductoResponse, PuntoDeVentaResponse, ResenaResponse } from '@/types';
import type { PageResponse } from '@/api';
import { useCart } from '../cart/useCart';
import { formatFecha } from '../lib/format';
import { BackLink, ErrorState, OccupancyChart, ProductCard } from '../components';

// Agrupa el menu por categoria conservando el orden de llegada de las categorias.
function agruparPorCategoria(productos: ProductoResponse[]): Array<[string, ProductoResponse[]]> {
  const grupos = new Map<string, ProductoResponse[]>();
  for (const producto of productos) {
    const categoria = producto.categoria ?? 'Otros';
    const lista = grupos.get(categoria) ?? [];
    lista.push(producto);
    grupos.set(categoria, lista);
  }
  return [...grupos.entries()];
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function VendorDetail() {
  const { id = '' } = useParams();
  const cart = useCart();
  usePageChrome('Detalle de local', { maxWidth: 1080 });

  const detalle = useApi<PuntoDeVentaResponse>(
    (signal) => http.get(endpoints.puntosDeVenta.detail(id), { signal }),
    [id],
  );
  const menu = useApi<ProductoResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.productos(id), { signal }),
    [id],
  );
  const ocupacion = useApi<OcupacionResponse>(
    (signal) => http.get(endpoints.cliente.ocupacion(id), { signal }),
    [id],
  );

  const { page, size, apiPage, setPage } = usePagination({ defaultSize: 5 });
  const resenas = useApi<PageResponse<ResenaResponse>>(
    (signal) => http.getPage(endpoints.puntosDeVenta.resenas(id), { params: { page: apiPage, size }, signal }),
    [id, apiPage, size],
  );

  const [confirmar, setConfirmar] = useState<ProductoResponse | null>(null);

  const local = detalle.data;
  const grupos = useMemo(() => agruparPorCategoria(menu.data ?? []), [menu.data]);

  const agregar = (producto: ProductoResponse) => {
    if (!local) return;
    // si el carrito tiene productos de otro local, primero confirmamos vaciarlo
    if (cart.isOtherVendor(local.id)) {
      setConfirmar(producto);
      return;
    }
    cart.add(producto, { id: local.id, nombre: local.nombre });
  };

  const confirmarCambioDeLocal = () => {
    if (local && confirmar) cart.add(confirmar, { id: local.id, nombre: local.nombre });
    setConfirmar(null);
  };

  if (detalle.loading) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink to={paths.cliente.home} />
        <Skeleton height={176} rounded="rounded-card" />
        <Skeleton width={220} height={26} />
        <SkeletonBlock />
      </div>
    );
  }
  if (detalle.error) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink to={paths.cliente.home} />
        <ErrorState error={detalle.error} onRetry={detalle.refetch} title="No pudimos cargar el local" />
      </div>
    );
  }
  if (!local) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink to={paths.cliente.home} />
        <EmptyState icon="store" title="Local no encontrado" description="Es posible que ya no esté disponible." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageActions>
        {cart.count > 0 && (
          <Link to={paths.cliente.carrito}>
            <Button size="sm" icon="bag">
              Ver carrito · {cart.count}
            </Button>
          </Link>
        )}
      </PageActions>

      <BackLink to={paths.cliente.home} />

      <div className="overflow-hidden rounded-card border border-line">
        <div className="relative grid h-44 place-items-center bg-brand-soft text-brand-text">
          <Icon name="coffee" size={64} strokeWidth={1.2} />
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1 text-badge font-semibold text-ink">
              <span className={cn('h-1.5 w-1.5 rounded-full', local.abierto ? 'bg-accent' : 'bg-ink-muted')} />
              {local.abierto ? 'Abierto' : 'Cerrado'}
            </span>
            <WaitTimeBadge minutes={local.tiempoEsperaEstimado} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-h2 font-bold tracking-tight text-ink">{local.nombre}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-small text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <Icon name="mapPin" size={14} className="text-ink-muted" />
            {local.ubicacion}
          </span>
          {local.horarioApertura && local.horarioCierre && (
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" size={14} className="text-ink-muted" />
              {local.horarioApertura.slice(0, 5)} – {local.horarioCierre.slice(0, 5)}
            </span>
          )}
          {local.tasaCumplimiento != null && (
            <span className="inline-flex items-center gap-1">
              <Icon name="checkCircle" size={14} className="text-ink-muted" />
              {Math.round(local.tasaCumplimiento * 100)}% cumplimiento
            </span>
          )}
        </div>
      </div>

      {!local.abierto && (
        <StateBanner tone="info">
          El local está cerrado ahora. Puedes mirar el menú, pero no pedir hasta que abra.
        </StateBanner>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {menu.loading ? (
            <SkeletonBlock />
          ) : menu.error ? (
            <ErrorState error={menu.error} onRetry={menu.refetch} title="No pudimos cargar el menú" />
          ) : grupos.length === 0 ? (
            <EmptyState icon="utensils" title="Sin productos" description="Este local todavía no publicó su menú." compact />
          ) : (
            grupos.map(([categoria, productos]) => (
              <div key={categoria} className="flex flex-col gap-3">
                <h3 className="text-h3 font-semibold text-ink">{categoria}</h3>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {productos.map((producto) => (
                    <ProductCard
                      key={producto.id}
                      producto={producto}
                      cantidad={cart.getQty(producto.id)}
                      onAdd={() => agregar(producto)}
                      onSetQty={(qty) => cart.setQty(producto.id, qty)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="w-full shrink-0 lg:sticky lg:top-2 lg:w-80">
          <div className="flex flex-col gap-4">
            {ocupacion.data && <OccupancyChart ocupacion={ocupacion.data} />}

            <Card className="flex flex-col gap-3">
              <span className="ql-section-label">Reseñas</span>
              {resenas.loading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton height={48} />
                  <Skeleton height={48} />
                </div>
              ) : resenas.error ? (
                <ErrorState error={resenas.error} onRetry={resenas.refetch} title="No pudimos cargar las reseñas" />
              ) : !resenas.data || resenas.data.content.length === 0 ? (
                <EmptyState icon="star" title="Aún sin reseñas" description="Sé el primero en opinar tras tu pedido." compact />
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {resenas.data.content.map((resena, i) => (
                      <div key={resena.id} className={cn('flex gap-2.5', i > 0 && 'border-t border-line pt-3')}>
                        <Avatar initials={iniciales(resena.autorNombre)} size={34} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-small font-semibold text-ink">{resena.autorNombre}</span>
                            <Stars value={resena.calificacion} size={12} />
                          </div>
                          {resena.comentario && (
                            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{resena.comentario}</p>
                          )}
                          <div className="mt-0.5 text-[11px] text-ink-muted">
                            {OBJETIVO_RESENA_LABELS[resena.objetivoTipo]} · {formatFecha(resena.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {resenas.data.totalElements > size && (
                    <Pagination page={page} size={size} total={resenas.data.totalElements} onPage={setPage} />
                  )}
                </>
              )}
            </Card>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmar !== null}
        onClose={() => setConfirmar(null)}
        onConfirm={confirmarCambioDeLocal}
        title="¿Vaciar el carrito?"
        description="Tu carrito tiene productos de otro local. Un pedido es de un solo local, así que empezaremos de nuevo con este."
        confirmLabel="Vaciar y agregar"
      />
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton height={96} rounded="rounded-card" />
      <Skeleton height={96} rounded="rounded-card" />
    </div>
  );
}
