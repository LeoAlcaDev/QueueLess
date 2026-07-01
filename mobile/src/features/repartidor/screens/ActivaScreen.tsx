import { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  type IconName,
  MarkersMap,
  Screen,
  Skeleton,
  StateBanner,
  Text,
} from '@/components';
import { useApi, useToast } from '@/hooks';
import { api, endpoints, unwrap } from '@/api';
import type { ApiError, ApiResponse, EstadoSolicitudDelivery, SolicitudDeliveryResponse } from '@/api';
import { coordsFor } from '../campus';
import { useRepartidor } from '../state/RepartidorContext';

const PASOS = ['Recoger', 'Entregar'];

function pasoActual(estado: EstadoSolicitudDelivery): number {
  if (estado === 'ENTREGADO') return 2;
  if (estado === 'RECOGIDO') return 1;
  return 0;
}

// Entrega en curso, guiada por pasos (recoger → entregar) sin mapa de seguimiento.
// El mapa solo ubica el local de origen y la zona de destino en el campus.
export function ActivaScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const nav = useNavigation<any>();
  const toast = useToast();
  const { activeSolicitudId } = useRepartidor();

  const cargar = useApi(
    useCallback(async (signal: AbortSignal, id: number) => {
      const res = await api.get<ApiResponse<SolicitudDeliveryResponse>>(endpoints.repartidor.solicitud(id), { signal });
      return unwrap(res);
    }, []),
  );

  const recoger = useApi(
    useCallback(async (signal: AbortSignal, id: number) => {
      const res = await api.post<ApiResponse<SolicitudDeliveryResponse>>(
        endpoints.repartidor.confirmarRecogida(id),
        undefined,
        { signal },
      );
      return unwrap(res);
    }, []),
  );

  useEffect(() => {
    if (activeSolicitudId !== null) cargar.run(activeSolicitudId).catch(() => {});
  }, [activeSolicitudId, cargar.run]);

  if (activeSolicitudId === null) {
    return (
      <Screen>
        <EmptyState
          icon="bike"
          title="No tienes una entrega activa"
          message="Acepta una solicitud disponible para empezar a entregar."
          action={{ label: 'Ver solicitudes', onPress: () => nav.navigate('Disponibles') }}
        />
      </Screen>
    );
  }

  // a partir de aquí la entrega activa existe; fijamos su id como número para usarlo
  // sin sustos dentro de los callbacks
  const solicitudId: number = activeSolicitudId;
  const solicitud = cargar.data;

  if (cargar.loading && solicitud === null) {
    return (
      <Screen scroll>
        <Skeleton width="100%" height={30} />
        <Skeleton width="100%" height={180} radius={t.radii.card} style={{ marginTop: t.spacing[4] }} />
        <Skeleton width="100%" height={72} radius={t.radii.card} style={{ marginTop: t.spacing[4] }} />
        <Skeleton width="100%" height={72} radius={t.radii.card} style={{ marginTop: t.spacing[3] }} />
      </Screen>
    );
  }

  if (cargar.error || solicitud === null) {
    return (
      <Screen>
        <StateBanner
          tone="error"
          title="No pudimos cargar la entrega"
          message={cargar.error?.message ?? 'Intenta de nuevo en un momento.'}
          action={{ label: 'Reintentar', onPress: () => cargar.run(solicitudId).catch(() => {}) }}
        />
      </Screen>
    );
  }

  const step = pasoActual(solicitud.estado);

  async function onRecoger() {
    try {
      await recoger.run(solicitudId);
      toast.success('Recogida confirmada · ahora entrega al cliente');
      cargar.run(solicitudId).catch(() => {});
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.message);
      // si el estado cambió por debajo, re-sincronizamos la vista
      if (apiError.kind === 'business') cargar.run(solicitudId).catch(() => {});
    }
  }

  const marcadores = [
    { id: 'origen', ...coordsFor(solicitud.puntoDeVentaNombre), title: solicitud.puntoDeVentaNombre, tone: 'brand' as const },
    { id: 'destino', ...coordsFor(solicitud.zonaEntrega), title: solicitud.zonaEntrega, tone: 'points' as const },
  ];

  const cta =
    solicitud.estado === 'ASIGNADO' ? (
      <Button title="Confirmar recogida" onPress={onRecoger} loading={recoger.loading} fullWidth />
    ) : solicitud.estado === 'RECOGIDO' ? (
      <Button
        title="Confirmar entrega · escanear QR"
        leftIcon="qrCode"
        onPress={() => nav.navigate('ConfirmarEntrega')}
        fullWidth
      />
    ) : null;

  return (
    <Screen scroll footer={cta ?? undefined}>
      <StepsHeader step={step} />

      <View style={s.mapa}>
        <MarkersMap markers={marcadores} height={180} />
      </View>

      <View style={s.cards}>
        <PlaceCard label="Recoger en" icon="store" title={solicitud.puntoDeVentaNombre} sub={solicitud.puntoDeVentaUbicacion} />
        <PlaceCard label="Entregar a" icon="userRound" title={solicitud.zonaEntrega} sub={`Pedido #${solicitud.pedidoId}`} tone="points" />
        <StateBanner tone="points" icon="bolt" message="Ganarás +50 QueuePoints al completar esta entrega." />
      </View>
    </Screen>
  );
}

function StepsHeader({ step }: { step: number }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.stepper}>
      <StepBubble index={0} step={step} label={PASOS[0]} />
      <View style={[s.connector, { backgroundColor: step > 0 ? t.colors.brandStrong : t.colors.borderDefault }]} />
      <StepBubble index={1} step={step} label={PASOS[1]} />
    </View>
  );
}

function StepBubble({ index, step, label }: { index: number; step: number; label: string }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const done = index < step;
  const active = index === step;
  const on = done || active;
  return (
    <View style={s.stepItem}>
      <View
        style={[
          s.stepCircle,
          { backgroundColor: on ? t.colors.brandStrong : t.colors.bgSurface2, borderColor: on ? t.colors.brandStrong : t.colors.borderDefault },
        ]}
      >
        {done ? (
          <Icon name="check" size={14} color={t.colors.onBrand} strokeWidth={3} />
        ) : (
          <Text variant="badge" style={{ color: on ? t.colors.onBrand : t.colors.textMuted }}>
            {String(index + 1)}
          </Text>
        )}
      </View>
      <Text variant="small" color={active ? 'textPrimary' : 'textMuted'} style={active ? s.stepLabelActive : undefined}>
        {label}
      </Text>
    </View>
  );
}

function PlaceCard({
  label,
  icon,
  title,
  sub,
  tone,
}: {
  label: string;
  icon: IconName;
  title: string;
  sub: string;
  tone?: 'points';
}) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const iconBg = tone === 'points' ? t.colors.pointsSoft : t.colors.bgSurface2;
  const iconColor = tone === 'points' ? t.colors.pointsStrong : t.colors.textMuted;
  return (
    <Card padding={14}>
      <Text variant="sectionLabel" style={s.placeLabel}>
        {label}
      </Text>
      <View style={s.placeRow}>
        <View style={[s.placeIcon, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={22} color={iconColor} />
        </View>
        <View style={s.placeTextos}>
          <Text variant="body" color="textPrimary" style={s.placeTitle}>
            {title}
          </Text>
          <Text variant="small" color="textSecondary">
            {sub}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    stepper: { flexDirection: 'row', alignItems: 'center', paddingVertical: t.spacing[1] },
    stepItem: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] },
    stepCircle: {
      width: 30,
      height: 30,
      borderRadius: t.radii.pill,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepLabelActive: { fontFamily: t.fontFamily.bold },
    connector: { flex: 1, height: 2, marginHorizontal: t.spacing[2], minWidth: 24 },
    mapa: { marginTop: t.spacing[4], marginBottom: t.spacing[4] },
    cards: { gap: t.spacing[3] },
    placeLabel: { marginBottom: t.spacing[2] },
    placeRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    placeIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    placeTextos: { flex: 1, minWidth: 0 },
    placeTitle: { fontFamily: t.fontFamily.semibold },
  });
}
