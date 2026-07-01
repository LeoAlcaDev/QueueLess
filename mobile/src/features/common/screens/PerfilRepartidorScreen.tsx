import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Card, MetricCard, Screen, Skeleton, StateBanner, Toggle } from '@/components/ui';
import { ScreenHeader } from '@/features/common/components';
import { useApi, useToast } from '@/hooks';
import { api, ApiError, endpoints, unwrap } from '@/api';
import type { ApiResponse, PerfilesResponse } from '@/api/types';

// Perfil del repartidor: el interruptor de disponibilidad (que guarda al instante)
// y sus métricas de calificación y entregas, de solo lectura.
export function PerfilRepartidorScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();

  const cargar = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<PerfilesResponse>>(endpoints.perfiles.get(), { signal }).then(unwrap),
    [],
  );
  const { data, loading, error, run } = useApi(cargar);
  const repartidor = data?.repartidor ?? null;

  const [disponible, setDisponible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  useEffect(() => {
    if (!repartidor) return;
    setDisponible(repartidor.disponible);
  }, [repartidor]);

  async function cambiarDisponibilidad(siguiente: boolean) {
    setDisponible(siguiente);
    setGuardando(true);
    try {
      await api.put(endpoints.perfiles.repartidor(), { disponible: siguiente });
      toast.success(siguiente ? 'Estás disponible para entregas.' : 'Ya no recibirás solicitudes.');
    } catch (err) {
      // si falla, deshacemos el cambio para no mentir sobre el estado real
      setDisponible(!siguiente);
      toast.error(err instanceof ApiError ? err.message : 'No pudimos cambiar tu disponibilidad.');
    } finally {
      setGuardando(false);
    }
  }

  const calificacion = repartidor?.calificacionPromedio;

  return (
    <Screen
      scroll
      padded
      header={
        <ScreenHeader
          title="Perfil de repartidor"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
      }
    >
      {loading && !data ? (
        <View style={s.skeletons}>
          <Skeleton width="100%" height={72} radius={t.radii.card} />
          <Skeleton width="100%" height={88} radius={t.radii.card} />
        </View>
      ) : error && !data ? (
        <StateBanner
          tone="error"
          title="No pudimos cargar tu perfil"
          message={error.message}
          action={{ label: 'Reintentar', onPress: () => run().catch(() => {}) }}
        />
      ) : !repartidor ? (
        <StateBanner
          tone="info"
          title="Sin perfil de repartidor"
          message="Activa el rol de repartidor para empezar a hacer entregas."
        />
      ) : (
        <View style={s.root}>
          <Card>
            <Toggle
              value={disponible}
              onValueChange={cambiarDisponibilidad}
              disabled={guardando}
              label="Disponible para entregas"
              sub="Recibe solicitudes cercanas cuando estés activo."
            />
          </Card>

          <View style={s.metricas}>
            <MetricCard
              icon="star"
              value={calificacion != null ? calificacion.toFixed(1) : '—'}
              label="Calificación"
              tone="warning"
            />
            <MetricCard icon="bike" value={repartidor.totalEntregas} label="Entregas" tone="brand" />
          </View>

          <StateBanner
            tone="info"
            title="Cómo funciona"
            message="Mientras estés disponible, te llegan las solicitudes de entrega del campus. Cada entrega completada suma 50 QueuePoints."
          />
        </View>
      )}
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[4] },
    skeletons: { gap: t.spacing[3] },
    metricas: { flexDirection: 'row', gap: t.spacing[3] },
  });
}
