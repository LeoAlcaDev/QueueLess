import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import {
  Card,
  EmptyState,
  MarkersMap,
  QueuePointsBadge,
  Screen,
  Skeleton,
  StateBanner,
  Text,
} from '@/components';
import { useApi, useToast } from '@/hooks';
import { api, endpoints, unwrap, unwrapList } from '@/api';
import type { ApiError, ApiResponse, SaldoResponse, SolicitudDeliveryResponse } from '@/api';
import { coordsFor } from '../campus';
import { useRepartidor } from '../state/RepartidorContext';
import { SolicitudCard } from '../components';

// Solicitudes de entrega en búsqueda cerca del repartidor. Arriba el saldo de
// QueuePoints y un mapa con los locales de recojo; abajo cada solicitud con su
// botón grande para aceptarla. Aceptar la marca como activa y salta a la entrega.
export function DisponiblesScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const nav = useNavigation<any>();
  const toast = useToast();
  const { setActive } = useRepartidor();
  const [aceptandoId, setAceptandoId] = useState<number | null>(null);

  const saldo = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<SaldoResponse>>(endpoints.queuepoints.saldo(), { signal });
      return unwrap(res);
    }, []),
  );

  const solicitudes = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<SolicitudDeliveryResponse[]>>(endpoints.repartidor.disponibles(), { signal });
      return unwrapList(res);
    }, []),
  );

  const aceptar = useApi(
    useCallback(async (signal: AbortSignal, id: number) => {
      const res = await api.post<ApiResponse<SolicitudDeliveryResponse>>(endpoints.repartidor.aceptar(id), undefined, {
        signal,
      });
      return unwrap(res);
    }, []),
  );

  const recargar = useCallback(() => {
    solicitudes.run().catch(() => {});
    saldo.run().catch(() => {});
  }, [solicitudes.run, saldo.run]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function onAceptar(solicitud: SolicitudDeliveryResponse) {
    setAceptandoId(solicitud.id);
    try {
      await aceptar.run(solicitud.id);
      setActive(solicitud.id);
      nav.navigate('Activa');
    } catch (err) {
      const apiError = err as ApiError;
      // 422: otro repartidor ya la tomó. Avisamos y refrescamos para que desaparezca.
      if (apiError.kind === 'business') toast.warning(apiError.message);
      else toast.error(apiError.message);
      solicitudes.run().catch(() => {});
    } finally {
      setAceptandoId(null);
    }
  }

  const items = solicitudes.data;
  const cargando = solicitudes.loading && items === null;
  const refrescando = solicitudes.loading && items !== null;
  const marcadores = (items ?? []).map((it) => ({
    id: String(it.id),
    ...coordsFor(it.puntoDeVentaNombre),
    title: it.puntoDeVentaNombre,
    tone: 'brand' as const,
  }));

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={t.colors.brand} colors={[t.colors.brand]} />
      }
    >
      <View style={s.head}>
        <Text variant="h2">Solicitudes disponibles</Text>
        {saldo.data ? <QueuePointsBadge amount={saldo.data.saldo} /> : null}
      </View>

      <View style={s.mapa}>
        <MarkersMap markers={marcadores} height={180} />
      </View>

      {cargando ? (
        <View style={s.lista}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : solicitudes.error ? (
        <StateBanner
          tone="error"
          title="No pudimos cargar las solicitudes"
          message={solicitudes.error.message}
          action={{ label: 'Reintentar', onPress: recargar }}
        />
      ) : items && items.length > 0 ? (
        <View style={s.lista}>
          {items.map((solicitud) => (
            <SolicitudCard
              key={solicitud.id}
              solicitud={solicitud}
              onAccept={() => onAceptar(solicitud)}
              accepting={aceptandoId === solicitud.id}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="bike"
          title="No hay entregas disponibles ahora"
          message="Te avisaremos cuando entre una solicitud cerca de ti. Mantente disponible."
        />
      )}
    </Screen>
  );
}

function SkeletonCard() {
  const t = useTheme();
  return (
    <Card padding={14}>
      <Skeleton width="60%" height={16} />
      <Skeleton width="40%" height={12} style={{ marginTop: t.spacing[2] }} />
      <Skeleton width="50%" height={12} style={{ marginTop: t.spacing[3] }} />
      <Skeleton width="100%" height={44} radius={t.radii.button} style={{ marginTop: t.spacing[4] }} />
    </Card>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing[3] },
    mapa: { marginBottom: t.spacing[4] },
    lista: { gap: t.spacing[3] },
  });
}
