import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Palette, Theme } from '@/theme';
import { api, endpoints, unwrap } from '@/api';
import type { ApiResponse, PedidoEstadoEvent, PedidoResponse } from '@/api';
import { useApi, useEventStream, useToast } from '@/hooks';
import {
  MOTIVO_CANCELACION_LABELS,
  TIPO_ENTREGA_LABELS,
  formatDateTime,
  isEstadoTerminal,
} from '@/lib';
import {
  Button,
  Card,
  ConfirmDialog,
  Icon,
  type IconName,
  Screen,
  Spinner,
  StateBanner,
  StatusBadge,
  SummaryRow,
  Text,
} from '@/components';
import { CountdownRing, OrderTimeline, TopBar } from '../components';

// círculo de ícono que encabeza los estados de cierre (listo / entregado / cancelado)
function IconFeature({
  icon,
  bg,
  fg,
  title,
  subtitle,
}: {
  icon: IconName;
  bg: keyof Palette;
  fg: keyof Palette;
  title: string;
  subtitle?: string;
}) {
  const t = useTheme();
  return (
    <View style={featureStyles.root}>
      <View style={[featureStyles.circle, { backgroundColor: t.colors[bg] }]}>
        <Icon name={icon} size={32} color={t.colors[fg]} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {subtitle ? (
        <Text variant="small" color="textSecondary" align="center">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SeguimientoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const pedidoId: number = route.params?.pedidoId;
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const toast = useToast();

  const pedidoApi = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<PedidoResponse>>(endpoints.cliente.pedido(pedidoId), { signal });
      return unwrap(res);
    }, [pedidoId]),
  );
  useEffect(() => {
    pedidoApi.run().catch(() => {});
  }, [pedidoApi.run]);

  const cancelar = useApi((signal) =>
    api.post<ApiResponse<PedidoResponse>>(endpoints.cliente.cancelar(pedidoId), {}, { signal }).then(unwrap),
  );
  const reintentar = useApi((signal) =>
    api
      .post<ApiResponse<unknown>>(endpoints.cliente.reintentarDelivery(pedidoId), {}, { signal })
      .then(unwrap),
  );
  const aPickup = useApi((signal) =>
    api.post<ApiResponse<unknown>>(endpoints.cliente.cambiarAPickup(pedidoId), {}, { signal }).then(unwrap),
  );

  const [confirm, setConfirm] = useState(false);

  // cada cambio de estado del backend re-lee el pedido para mover la línea de tiempo
  const onEvent = useCallback(
    (event: PedidoEstadoEvent) => {
      if (event.pedidoId === pedidoId) pedidoApi.run().catch(() => {});
    },
    [pedidoId, pedidoApi.run],
  );
  useEventStream<PedidoEstadoEvent>(endpoints.cliente.pedidosStream(), { onEvent });

  const pedido = pedidoApi.data;

  if (!pedido) {
    return (
      <Screen padded={false} header={<TopBar title="Tu pedido" onBack={() => navigation.goBack()} />}>
        <View style={s.loading}>
          {pedidoApi.error ? (
            <StateBanner
              tone="error"
              title="No pudimos cargar el pedido"
              message={pedidoApi.error.message}
              action={{ label: 'Reintentar', onPress: () => pedidoApi.run().catch(() => {}) }}
            />
          ) : (
            <Spinner size="lg" />
          )}
        </View>
      </Screen>
    );
  }

  const estado = pedido.estado;
  const live = !isEstadoTerminal(estado);
  const cancelled = estado.startsWith('CANCELADO') || estado === 'EXPIRADO';

  async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
    try {
      await accion();
      toast.success(mensaje);
      pedidoApi.run().catch(() => {});
    } catch {
      const message = cancelar.error?.message ?? reintentar.error?.message ?? aPickup.error?.message;
      toast.error(message ?? 'No pudimos completar la acción.');
    }
  }

  let feature: React.ReactNode = null;
  let actions: React.ReactNode = null;

  if (estado === 'PENDIENTE_PAGO') {
    feature = (
      <CountdownRing
        color="info"
        totalSecs={300}
        label="Tu pedido está reservado. Completa el pago para que el comercio lo prepare."
      />
    );
    actions = (
      <>
        <Button
          title={`Pagar S/ ${pedido.total.toFixed(2)}`}
          leftIcon="creditCard"
          onPress={() => navigation.navigate('Pago', { pedido })}
          fullWidth
        />
        <Button title="Cancelar pedido" variant="danger" onPress={() => setConfirm(true)} fullWidth />
      </>
    );
  } else if (estado === 'PAGADO_BUSCANDO_REPARTIDOR') {
    feature = (
      <CountdownRing
        color="points"
        totalSecs={240}
        label="Buscando un repartidor disponible para tu entrega comunitaria."
      />
    );
    actions = (
      <>
        <Button
          title="Reintentar búsqueda"
          variant="secondary"
          leftIcon="refresh"
          loading={reintentar.loading}
          onPress={() => ejecutar(() => reintentar.run(), 'Reintentando la búsqueda…')}
          fullWidth
        />
        <Button
          title="Cambiar a recojo"
          variant="secondary"
          leftIcon="shoppingBag"
          loading={aPickup.loading}
          onPress={() => ejecutar(() => aPickup.run(), 'Cambiado a recojo en tienda')}
          fullWidth
        />
        <Button title="Cancelar" variant="danger" onPress={() => setConfirm(true)} fullWidth />
      </>
    );
  } else if (estado === 'PAGADO_ESPERANDO_COMERCIO') {
    feature = (
      <IconFeature
        icon="clock"
        bg="infoBg"
        fg="infoFg"
        title="Esperando al comercio"
        subtitle="El comercio recibió tu pedido y lo aceptará en breve."
      />
    );
    actions = <Button title="Ver en vivo · se actualiza solo" variant="secondary" disabled onPress={() => {}} fullWidth />;
  } else if (estado === 'ACEPTADO' || estado === 'EN_PREPARACION') {
    const enPrep = estado === 'EN_PREPARACION';
    feature = (
      <CountdownRing
        color={enPrep ? 'warning' : 'brand'}
        totalSecs={enPrep ? 420 : 600}
        label={
          enPrep
            ? 'Tu pedido se está preparando. Te avisamos cuando esté listo.'
            : 'El comercio aceptó tu pedido y empezará a prepararlo.'
        }
      />
    );
    actions = <Button title="Ver en vivo · se actualiza solo" variant="secondary" disabled onPress={() => {}} fullWidth />;
  } else if (estado === 'LISTO_PARA_RECOGER' || estado === 'LISTO_PARA_DELIVERY') {
    const delivery = estado === 'LISTO_PARA_DELIVERY';
    feature = (
      <IconFeature
        icon="checkCircle"
        bg="successBg"
        fg="successFg"
        title="¡Tu pedido está listo!"
        subtitle={`Muestra tu QR ${delivery ? 'al repartidor' : 'en el mostrador'} para recogerlo.`}
      />
    );
    actions = (
      <Button title="Mostrar QR" leftIcon="qrCode" onPress={() => navigation.navigate('Qr', { pedido })} fullWidth />
    );
  } else if (estado === 'ENTREGADO') {
    feature = (
      <IconFeature
        icon="checkCheck"
        bg="successBg"
        fg="successFg"
        title="Pedido entregado"
        subtitle={pedido.entregadoAt ? formatDateTime(pedido.entregadoAt) : undefined}
      />
    );
    actions = (
      <>
        <Button
          title="Dejar reseña"
          leftIcon="star"
          onPress={() => navigation.navigate('Resena', { pedidoId: pedido.id })}
          fullWidth
        />
        <Button
          title="Repetir pedido"
          variant="secondary"
          leftIcon="refresh"
          onPress={() => navigation.navigate('PuntoDetalle', { puntoId: pedido.puntoDeVentaId })}
          fullWidth
        />
      </>
    );
  } else if (cancelled) {
    feature = (
      <IconFeature
        icon="xCircle"
        bg="errorBg"
        fg="errorFg"
        title={estado === 'CANCELADO_POR_COMERCIO' ? 'Pedido cancelado por el comercio' : 'Pedido cancelado'}
      />
    );
    actions = (
      <Button
        title="Buscar otro local"
        variant="secondary"
        leftIcon="refresh"
        onPress={() => navigation.navigate('Inicio', { screen: 'Home' })}
        fullWidth
      />
    );
  }

  const motivo = cancelled && pedido.motivoCancelacion ? (
    <StateBanner
      tone="error"
      title="Motivo del comercio"
      message={`${MOTIVO_CANCELACION_LABELS[pedido.motivoCancelacion]}${
        pedido.detalleCancelacion ? ` · ${pedido.detalleCancelacion}` : ''
      }`}
    />
  ) : null;

  return (
    <Screen scroll padded={false} header={<TopBar title="Tu pedido" onBack={() => navigation.goBack()} />}>
      <View style={s.content}>
        <View style={s.feature}>{feature}</View>

        {motivo}

        {!cancelled ? (
          <Card padding={16}>
            <View style={s.timelineHead}>
              <Text variant="sectionLabel">Progreso del pedido</Text>
              {live ? (
                <View style={s.liveRow}>
                  <View style={s.liveDot} />
                  <Text variant="badge" color="accentText">
                    En vivo
                  </Text>
                </View>
              ) : null}
            </View>
            <OrderTimeline estado={estado} />
          </Card>
        ) : null}

        <Card padding={16}>
          <View style={s.summaryHead}>
            <View style={s.summaryTitle}>
              <Text variant="label" color="textPrimary" style={s.code}>
                {pedido.codigo}
              </Text>
              <Text variant="small" color="textMuted">
                {TIPO_ENTREGA_LABELS[pedido.tipoEntrega]}
              </Text>
            </View>
            <StatusBadge estado={estado} size="sm" />
          </View>
          <View style={s.summary}>
            {pedido.items.map((it) => (
              <SummaryRow
                key={it.id}
                label={`${it.cantidad}× ${it.nombre}`}
                value={`S/ ${it.subtotal.toFixed(2)}`}
              />
            ))}
            {pedido.descuentoQpts > 0 ? (
              <SummaryRow
                label="Descuento QueuePoints"
                value={`– S/ ${pedido.descuentoQpts.toFixed(2)}`}
                tone="points"
              />
            ) : null}
            <View style={s.divider} />
            <SummaryRow label="Total" value={`S/ ${pedido.total.toFixed(2)}`} strong />
          </View>
        </Card>

        <View style={s.actions}>{actions}</View>
      </View>

      <ConfirmDialog
        visible={confirm}
        title="¿Cancelar este pedido?"
        message="Si el comercio aún no lo aceptó, recibirás el reembolso completo."
        confirmLabel="Sí, cancelar"
        cancelLabel="No"
        destructive
        loading={cancelar.loading}
        onConfirm={async () => {
          setConfirm(false);
          await ejecutar(() => cancelar.run(), 'Pedido cancelado · reembolso en proceso');
        }}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}

const featureStyles = StyleSheet.create({
  root: { alignItems: 'center', gap: 10 },
  circle: { width: 64, height: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4], gap: t.spacing[4] },
    loading: { flex: 1, justifyContent: 'center', padding: t.spacing[4] },
    feature: { alignItems: 'center', paddingVertical: t.spacing[2] },
    timelineHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: t.spacing[4],
    },
    liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    liveDot: { width: 7, height: 7, borderRadius: t.radii.pill, backgroundColor: t.colors.accent },
    summaryHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: t.spacing[3],
      gap: t.spacing[2],
    },
    summaryTitle: { gap: 1, flex: 1 },
    code: { fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
    summary: { gap: t.spacing[2] },
    divider: { height: 1, backgroundColor: t.colors.borderDefault, marginVertical: 2 },
    actions: { gap: t.spacing[2] },
  });
}
