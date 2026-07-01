import { useMemo, useState } from 'react';
import { http, endpoints } from '@/api';
import { useApi, useDebouncedValue } from '@/hooks';
import { Button, EmptyState, SearchBar, Segmented, SkeletonCard } from '@/components/ui';
import type { PuntoDeVentaResponse } from '@/types';
import { PublicShell, VendorCardPublic, PublicErrorState } from '../components';

type Orden = 'tiempo' | 'nombre';

// Catálogo público de locales del campus: cualquier visitante puede mirarlo sin sesión. Buscador
// en vivo (con debounce) y orden por tiempo de espera o por nombre. Filtrado y orden son del lado
// del cliente sobre la lista que ya trajimos del endpoint público.
export default function Explorar() {
  const { data, loading, error, refetch } = useApi<PuntoDeVentaResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.list, { signal }),
    [],
  );

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

  return (
    <PublicShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[240px] flex-1">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
              Explora los locales del campus
            </h1>
            <p className="mt-1 text-[15px] text-ink-soft">
              Pre-ordena y recoge sin colas, inicia sesión para pedir.
            </p>
          </div>
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Busca un local o ubicación"
            className="w-full sm:w-[360px]"
          />
        </div>

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
          <PublicErrorState error={error} onRetry={refetch} />
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
              <VendorCardPublic key={local.id} vendor={local} />
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
