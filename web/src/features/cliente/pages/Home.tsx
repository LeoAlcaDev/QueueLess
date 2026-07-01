import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { http, endpoints } from '@/api';
import { useApi, useDebouncedValue } from '@/hooks';
import { useAuth } from '@/auth';
import { usePageChrome, PageActions } from '@/components/layout';
import { Button, Icon, QueuePointsBadge, SearchBar, Segmented, SkeletonCard, EmptyState } from '@/components/ui';
import { paths } from '@/routes/paths';
import type { PuntoDeVentaResponse, SaldoResponse } from '@/types';
import { VendorCard, ErrorState } from '../components';

type Orden = 'tiempo' | 'nombre';

// Catalogo de locales del campus. Buscador en vivo (con debounce) y orden por tiempo de
// espera o por nombre. El filtrado y el orden son del lado del cliente sobre la lista que ya
// trajimos del backend.
export default function Home() {
  usePageChrome('Inicio', { sub: 'UTEC · Campus Barranco', maxWidth: 1080 });
  const { user } = useAuth();

  const { data, loading, error, refetch } = useApi<PuntoDeVentaResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.list, { signal }),
    [],
  );
  const saldo = useApi<SaldoResponse>((signal) => http.get(endpoints.queuepoints.saldo, { signal }), []);

  const [query, setQuery] = useState('');
  const [orden, setOrden] = useState<Orden>('tiempo');
  const busqueda = useDebouncedValue(query).trim().toLowerCase();

  const visibles = useMemo(() => {
    const locales = data ?? [];
    const filtrados: PuntoDeVentaResponse[] = [];
    for (const local of locales) {
      if (busqueda) {
        const texto = `${local.nombre} ${local.ubicacion}`.toLowerCase();
        if (!texto.includes(busqueda)) continue;
      }
      filtrados.push(local);
    }
    const ordenados = [...filtrados];
    if (orden === 'tiempo') ordenados.sort((a, b) => a.tiempoEsperaEstimado - b.tiempoEsperaEstimado);
    else ordenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return ordenados;
  }, [data, busqueda, orden]);

  const abiertos = visibles.filter((l) => l.abierto).length;
  const primerNombre = user?.nombreCompleto?.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Link to={paths.cliente.queuepoints} aria-label="Ver tus QueuePoints">
          <QueuePointsBadge points={saldo.data?.saldo ?? 0} />
        </Link>
      </PageActions>

      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-[240px] flex-1">
          <h2 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
            {primerNombre ? `Hola, ${primerNombre}` : 'Hola'}
          </h2>
          <p className="mt-0.5 text-[15px] text-ink-soft">¿Qué vas a pedir hoy?</p>
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Busca un local o platillo"
          className="w-full sm:w-[360px]"
        />
      </div>

      <Link to={paths.cliente.asistente} className="block max-w-lg">
        <div className="flex items-center gap-3.5 rounded-card bg-points-soft p-4 transition-shadow duration-150 ease-quart hover:shadow-md">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-button bg-points text-on-brand">
            <Icon name="sparkles" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-small font-bold text-points-strong">Pregúntale al asistente</div>
            <div className="text-[12.5px] text-ink-soft">"Algo sin gluten y barato" · te recomienda platos seguros</div>
          </div>
          <Icon name="chevronRight" size={18} className="shrink-0 text-points-strong" />
        </div>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="ql-section-label">
          {loading ? 'Locales' : `${abiertos} ${abiertos === 1 ? 'local abierto' : 'locales abiertos'}`}
        </span>
        <Segmented
          value={orden}
          onChange={setOrden}
          options={[
            { value: 'tiempo', label: 'Por tiempo' },
            { value: 'nombre', label: 'Por nombre' },
          ]}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : visibles.length === 0 ? (
        <EmptyState
          icon="store"
          title={busqueda ? 'Sin resultados' : 'No hay locales abiertos ahora'}
          description={
            busqueda
              ? 'Prueba con otra búsqueda.'
              : 'Los puntos de venta del campus abren entre las 07:30 y las 20:00. Vuelve más tarde.'
          }
          action={
            <Button variant="secondary" icon="refresh" onClick={refetch}>
              Actualizar
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibles.map((local) => (
            <VendorCard key={local.id} vendor={local} />
          ))}
        </div>
      )}
    </div>
  );
}
