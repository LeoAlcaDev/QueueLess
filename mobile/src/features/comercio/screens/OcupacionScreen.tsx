import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrapList, unwrap } from '@/api';
import type { ApiResponse, FranjaOcupacion, OcupacionResponse, PuntoDeVentaResponse } from '@/api/types';
import { Card, EmptyState, MetricCard, OccupancyChart, Screen, Select, Skeleton, StateBanner, Text } from '@/components';
import { useApi } from '@/hooks';

// día de la semana en formato ISO (1 = lunes … 7 = domingo), para filtrar las
// franjas a la jornada de hoy
function isoDiaSemana(): number {
  const js = new Date().getDay();
  return js === 0 ? 7 : js;
}

export function OcupacionScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const fetchLocales = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<PuntoDeVentaResponse[]>>(endpoints.comercio.pdv(), { signal }).then(unwrapList),
    [],
  );
  const locales = useApi(fetchLocales);

  const fetchOcupacion = useCallback(
    (signal: AbortSignal, puntoDeVentaId: number) =>
      api.get<ApiResponse<OcupacionResponse>>(endpoints.comercio.ocupacion(puntoDeVentaId), { signal }).then(unwrap),
    [],
  );
  const ocupacion = useApi(fetchOcupacion);

  const [pdvId, setPdvId] = useState<number | null>(null);

  useEffect(() => {
    locales.run().catch(() => {});
  }, [locales.run]);

  useEffect(() => {
    if (pdvId == null && locales.data && locales.data.length > 0) {
      setPdvId(locales.data[0].id);
    }
  }, [locales.data, pdvId]);

  useEffect(() => {
    if (pdvId != null) ocupacion.run(pdvId).catch(() => {});
  }, [pdvId, ocupacion.run]);

  const data = ocupacion.data;
  const horaActual = new Date().getHours();

  // franjas de hoy; si el backend no separa por día, mostramos todas
  const franjasHoy: FranjaOcupacion[] = useMemo(() => {
    if (!data) return [];
    const hoy = data.franjas.filter((f) => f.diaSemana === isoDiaSemana());
    return hoy.length > 0 ? hoy : data.franjas;
  }, [data]);

  const pico = useMemo(() => {
    if (franjasHoy.length === 0) return null;
    let mejor = franjasHoy[0];
    for (const f of franjasHoy) {
      if ((f.pedidosTipicos ?? 0) > (mejor.pedidosTipicos ?? 0)) mejor = f;
    }
    return mejor;
  }, [franjasHoy]);

  const totalPedidos = franjasHoy.reduce((suma, f) => suma + (f.pedidosTipicos ?? 0), 0);
  const hayDatos = (data?.hayDatosSuficientes ?? false) && franjasHoy.length > 0;

  const sinLocales = !locales.loading && (locales.data?.length ?? 0) === 0;

  return (
    <Screen scroll>
      <Text variant="h2" style={s.title}>
        Ocupación
      </Text>

      {sinLocales ? (
        <EmptyState
          icon="store"
          title="Aún no tienes locales"
          message="Crea un punto de venta para ver su ocupación por hora."
        />
      ) : (
        <>
          {locales.data && locales.data.length > 0 ? (
            <View style={s.selector}>
              <Select
                label="Local"
                value={pdvId != null ? String(pdvId) : null}
                onChange={(value) => setPdvId(Number(value))}
                options={locales.data.map((local) => ({ value: String(local.id), label: local.nombre }))}
              />
            </View>
          ) : null}

          {ocupacion.loading && !data ? (
            <Card>
              <Skeleton width="40%" height={12} />
              <View style={{ height: t.spacing[4] }} />
              <Skeleton width="100%" height={110} radius={10} />
            </Card>
          ) : (
            <Card padding={20}>
              <Text variant="sectionLabel" style={s.sectionLabel}>
                Ocupación por hora
              </Text>
              <OccupancyChart franjas={franjasHoy} horaActual={horaActual} hayDatosSuficientes={hayDatos} />
            </Card>
          )}

          {hayDatos ? (
            <View style={s.metrics}>
              <MetricCard
                icon="trendUp"
                value={pico ? `${String(pico.hora).padStart(2, '0')}:00` : '—'}
                label="Hora pico"
                tone="warning"
              />
              <MetricCard icon="clock" value={`${data?.minutosAhora ?? 0} min`} label="Espera ahora" />
              <MetricCard icon="receipt" value={totalPedidos} label="Pedidos típicos del día" />
            </View>
          ) : null}

          {hayDatos && pico ? (
            <View style={s.tip}>
              <StateBanner
                tone="info"
                message={`Tu hora pico es a las ${String(pico.hora).padStart(2, '0')}:00. Considera sumar personal o pre-preparar lotes para reducir la espera.`}
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    title: { marginBottom: t.spacing[3] },
    selector: { marginBottom: t.spacing[3] },
    sectionLabel: { marginBottom: t.spacing[4] },
    metrics: { gap: t.spacing[3], marginTop: t.spacing[3] },
    tip: { marginTop: t.spacing[3] },
  });
}
