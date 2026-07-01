import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { http, endpoints } from '@/api';
import { useApi, usePagination } from '@/hooks';
import { Button, EmptyState, Icon, Skeleton, StateBanner, WaitTimeBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import type { PageResponse } from '@/api';
import type { ProductoResponse, PuntoDeVentaResponse, ResenaResponse } from '@/types';
import { publicoPaths } from '../paths';
import { PublicShell, ProductRowPublic, ReviewList, PublicErrorState } from '../components';

// Agrupa el menú por categoría conservando el orden de llegada de las categorías.
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

// Detalle público de un local: el menú de solo lectura y las reseñas, sin sesión. La única forma
// de pedir es iniciar sesión, así que toda invitación a ordenar lleva al login. No mostramos la
// ocupación por hora porque ese endpoint es del área cliente y exige token.
export default function ExplorarLocal() {
  const { id = '' } = useParams();

  const detalle = useApi<PuntoDeVentaResponse>(
    (signal) => http.get(endpoints.puntosDeVenta.detail(id), { signal }),
    [id],
  );
  const menu = useApi<ProductoResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.productos(id), { signal }),
    [id],
  );

  const { page, size, apiPage, setPage } = usePagination({ defaultSize: 5 });
  const resenas = useApi<PageResponse<ResenaResponse>>(
    (signal) => http.getPage(endpoints.puntosDeVenta.resenas(id), { params: { page: apiPage, size }, signal }),
    [id, apiPage, size],
  );

  const local = detalle.data;
  const grupos = useMemo(() => agruparPorCategoria(menu.data ?? []), [menu.data]);

  const volver = (
    <Link
      to={publicoPaths.explorar}
      className="inline-flex w-fit items-center gap-1.5 text-small font-semibold text-ink-soft transition-colors duration-150 ease-quart hover:text-ink"
    >
      <Icon name="arrowLeft" size={16} />
      Volver a explorar
    </Link>
  );

  if (detalle.loading) {
    return (
      <PublicShell>
        <div className="flex flex-col gap-4">
          {volver}
          <Skeleton height={180} rounded="rounded-card" />
          <Skeleton width={220} height={26} />
          <SkeletonBlock />
        </div>
      </PublicShell>
    );
  }

  // El 404 (o local ajeno) se ve como "no encontrado" con la salida de vuelta al catálogo.
  if (detalle.error && detalle.error.kind !== 'notFound') {
    return (
      <PublicShell>
        <div className="flex flex-col gap-4">
          {volver}
          <PublicErrorState error={detalle.error} onRetry={detalle.refetch} title="No pudimos cargar el local" />
        </div>
      </PublicShell>
    );
  }
  if (!local) {
    return (
      <PublicShell>
        <div className="flex flex-col gap-4">
          {volver}
          <EmptyState
            icon="store"
            title="Local no encontrado"
            description="Es posible que ya no esté disponible."
            action={
              <Link to={publicoPaths.explorar}>
                <Button variant="secondary" icon="arrowLeft">
                  Volver a explorar
                </Button>
              </Link>
            }
          />
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="flex flex-col gap-5">
        {volver}

        <div className="overflow-hidden rounded-card border border-line">
          <div className="relative grid h-44 place-items-center bg-brand-soft text-brand-text">
            <Icon name="coffee" size={64} strokeWidth={1.2} />
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-2.5 py-1 text-badge font-semibold text-ink">
                <span className={cn('h-1.5 w-1.5 rounded-full', local.abierto ? 'bg-success-dot' : 'bg-ink-muted')} />
                {local.abierto ? 'Abierto' : 'Cerrado'}
              </span>
              <WaitTimeBadge minutes={local.tiempoEsperaEstimado} />
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-h2 font-bold tracking-tight text-ink">{local.nombre}</h1>
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
            El local está cerrado ahora. Puedes mirar el menú, pero solo se puede pedir dentro del horario.
          </StateBanner>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {menu.loading ? (
              <SkeletonBlock />
            ) : menu.error ? (
              <PublicErrorState error={menu.error} onRetry={menu.refetch} title="No pudimos cargar el menú" />
            ) : grupos.length === 0 ? (
              <EmptyState icon="utensils" title="Sin productos" description="Este local todavía no publicó su menú." compact />
            ) : (
              grupos.map(([categoria, productos]) => (
                <div key={categoria} className="flex flex-col gap-3">
                  <h2 className="text-h3 font-semibold text-ink">{categoria}</h2>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {productos.map((producto) => (
                      <ProductRowPublic key={producto.id} producto={producto} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <aside className="w-full shrink-0 lg:sticky lg:top-2 lg:w-80">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-card border border-line bg-brand-soft p-4">
                <div className="text-small font-semibold text-brand-text">¿Listo para pedir?</div>
                <p className="text-[12.5px] leading-snug text-ink-soft">
                  Inicia sesión para pre-ordenar en {local.nombre} y recoger con tu QR sin hacer cola.
                </p>
                <Link to={paths.login} className="block">
                  <Button icon="lock" full>
                    Inicia sesión para pedir
                  </Button>
                </Link>
              </div>

              <ReviewList resenas={resenas} page={page} size={size} onPage={setPage} />
            </div>
          </aside>
        </div>
      </div>
    </PublicShell>
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
