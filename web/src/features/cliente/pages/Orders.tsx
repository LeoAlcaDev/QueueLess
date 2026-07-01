import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { http, endpoints } from '@/api';
import type { PageResponse } from '@/api';
import { useApi, usePagination } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Button, EmptyState, Pagination, Skeleton, Tabs } from '@/components/ui';
import { paths } from '@/routes/paths';
import type { EstadoPedido, PedidoResponse, PuntoDeVentaResponse } from '@/types';
import { ErrorState, OrderRow } from '../components';

type Grupo = 'ACTIVOS' | 'ENTREGADOS' | 'CANCELADOS';

const CANCELADOS: EstadoPedido[] = ['CANCELADO_POR_CLIENTE', 'CANCELADO_POR_COMERCIO', 'EXPIRADO'];

function grupoDe(estado: EstadoPedido): Grupo {
  if (estado === 'ENTREGADO') return 'ENTREGADOS';
  if (CANCELADOS.includes(estado)) return 'CANCELADOS';
  return 'ACTIVOS';
}

export default function Orders() {
  usePageChrome('Mis pedidos', { sub: 'Sigue el estado de lo que pediste', maxWidth: 840 });

  const { page, size, apiPage, setPage } = usePagination({ defaultSize: 10 });
  const pedidos = useApi<PageResponse<PedidoResponse>>(
    (signal) => http.getPage(endpoints.cliente.pedidos.base, { params: { page: apiPage, size }, signal }),
    [apiPage, size],
  );
  const locales = useApi<PuntoDeVentaResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.list, { signal }),
    [],
  );

  const [tab, setTab] = useState<Grupo>('ACTIVOS');

  const nombrePorLocal = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const local of locales.data ?? []) mapa.set(local.id, local.nombre);
    return mapa;
  }, [locales.data]);

  const contenido = pedidos.data?.content ?? [];
  const visibles = contenido.filter((pedido) => grupoDe(pedido.estado) === tab);

  const cuenta = (grupo: Grupo) => contenido.filter((p) => grupoDe(p.estado) === grupo).length;

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        active={tab}
        onChange={(key) => setTab(key as Grupo)}
        tabs={[
          { key: 'ACTIVOS', label: 'Activos', count: cuenta('ACTIVOS') },
          { key: 'ENTREGADOS', label: 'Entregados', count: cuenta('ENTREGADOS') },
          { key: 'CANCELADOS', label: 'Cancelados', count: cuenta('CANCELADOS') },
        ]}
      />

      {pedidos.loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={84} rounded="rounded-card" />
          ))}
        </div>
      ) : pedidos.error ? (
        <ErrorState error={pedidos.error} onRetry={pedidos.refetch} />
      ) : contenido.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="Aún no tienes pedidos"
          description="Cuando hagas tu primer pedido aparecerá aquí con su estado en vivo."
          action={
            <Link to={paths.cliente.home}>
              <Button icon="store">Explorar locales</Button>
            </Link>
          }
        />
      ) : visibles.length === 0 ? (
        <EmptyState icon="receipt" title="Nada por aquí" description="No hay pedidos en esta pestaña." compact />
      ) : (
        <div className="flex flex-col gap-3">
          {visibles.map((pedido) => (
            <OrderRow key={pedido.id} pedido={pedido} vendorNombre={nombrePorLocal.get(pedido.puntoDeVentaId)} />
          ))}
        </div>
      )}

      {pedidos.data && pedidos.data.totalElements > 0 && (
        <Pagination page={page} size={size} total={pedidos.data.totalElements} onPage={setPage} />
      )}
    </div>
  );
}
