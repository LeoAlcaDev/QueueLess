import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { endpoints, http } from '@/api';
import { useApi } from '@/hooks';
import { Button, Card, EmptyState, Icon, Select, Skeleton, StateBanner } from '@/components/ui';
import { usePageChrome } from '@/components/layout';
import { paths } from '@/routes/paths';
import type { OcupacionResponse } from '@/types';
import { useStores } from '../hooks';
import { MetricCard } from '../components/MetricCard';
import { OccupancyChart } from '../components/OccupancyChart';

// Resume la curva en tres metricas legibles a partir de las franjas con datos suficientes.
function derivarMetricas(data: OcupacionResponse) {
  const conDatos = data.franjas.filter((f) => f.suficientesDatos && f.minutosEstimados != null);
  if (conDatos.length === 0) return null;

  let pico = conDatos[0];
  let sumaMin = 0;
  let pedidos = 0;
  for (const f of conDatos) {
    if ((f.minutosEstimados ?? 0) > (pico.minutosEstimados ?? 0)) pico = f;
    sumaMin += f.minutosEstimados ?? 0;
    pedidos += f.pedidosTipicos ?? 0;
  }
  return {
    horaPico: `${String(pico.hora).padStart(2, '0')}:00`,
    esperaPromedio: Math.round(sumaMin / conDatos.length),
    pedidos,
  };
}

// Ocupacion historica de un local hora por hora. Sirve al comercio para anticipar las horas
// punta. Se elige el local y se grafican las franjas del dia actual.
export default function Occupancy() {
  const navigate = useNavigate();
  const stores = useStores();
  const [storeId, setStoreId] = useState('');

  useEffect(() => {
    if (!storeId && stores.data && stores.data.length > 0) {
      setStoreId(String(stores.data[0].id));
    }
  }, [stores.data, storeId]);

  const localActual = stores.data?.find((s) => String(s.id) === storeId)?.nombre;
  usePageChrome('Ocupación del local', { sub: localActual ?? 'Horas punta de tu local', maxWidth: 860 });

  const ocupacion = useApi<OcupacionResponse | null>(
    (signal) => (storeId ? http.get(endpoints.comercio.ocupacion(storeId), { signal }) : Promise.resolve(null)),
    [storeId],
  );

  if (stores.loading && !stores.data) {
    return <Skeleton height={240} rounded="rounded-card" />;
  }

  if (stores.error) {
    return (
      <EmptyState
        icon="chart"
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

  if ((stores.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        icon="store"
        title="Primero crea un local"
        description="La ocupación se calcula por punto de venta."
        action={
          <Button icon="plus" onClick={() => navigate(paths.comercio.localNuevo)}>
            Crear local
          </Button>
        }
      />
    );
  }

  const storeOptions = (stores.data ?? []).map((s) => ({ value: String(s.id), label: s.nombre }));
  const data = ocupacion.data;
  const metricas = data ? derivarMetricas(data) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-xs">
        <Select label="Local" options={storeOptions} value={storeId} onChange={(e) => setStoreId(e.target.value)} />
      </div>

      {!storeId || (ocupacion.loading && !data) ? (
        <Skeleton height={240} rounded="rounded-card" />
      ) : ocupacion.error ? (
        <EmptyState
          icon="chart"
          title="No pudimos cargar la ocupación"
          description={ocupacion.error.message}
          action={
            <Button icon="refresh" onClick={ocupacion.refetch}>
              Reintentar
            </Button>
          }
        />
      ) : !data || data.franjas.length === 0 ? (
        <EmptyState
          icon="chart"
          title="Aún no hay datos de ocupación"
          description="Cuando el local acumule pedidos verás aquí sus horas punta."
        />
      ) : (
        <>
          <Card pad="lg" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="ql-section-label text-ink-soft">Ocupación por hora</div>
              <span className="inline-flex items-center gap-2 rounded-pill bg-brand-soft px-3 py-1.5 text-brand-text">
                <Icon name="clock" size={14} />
                <span className="text-small font-semibold">Ahora: {data.minutosAhora} min de espera</span>
              </span>
            </div>

            {!data.hayDatosSuficientes && (
              <StateBanner tone="info">
                {data.mensaje ?? 'Todavía no hay suficientes datos para una estimación confiable.'}
              </StateBanner>
            )}

            <OccupancyChart data={data} />
            <p className="text-[12px] text-ink-muted">Minutos estimados de espera por hora del día.</p>
          </Card>

          {metricas && (
            <>
              <div className="flex flex-col gap-3 lg:flex-row">
                <MetricCard icon="trendUp" label="Hora pico" value={metricas.horaPico} tone="warning" />
                <MetricCard icon="clock" label="Espera promedio" value={`${metricas.esperaPromedio} min`} />
                <MetricCard icon="receipt" label="Pedidos por semana" value={metricas.pedidos} tone="brand" />
              </div>

              <StateBanner tone="info">
                Tu hora pico es a las {metricas.horaPico}. Considera sumar personal o pre-preparar lotes para reducir la
                espera.
              </StateBanner>
            </>
          )}
        </>
      )}
    </div>
  );
}
