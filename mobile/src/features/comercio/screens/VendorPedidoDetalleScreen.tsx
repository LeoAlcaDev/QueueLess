import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import {
  ApiError,
  api,
  endpoints,
  normalizeError,
  unwrap,
  type ComercioPedidoAccion,
} from '@/api';
import type { ApiResponse, MotivoCancelacion, PedidoResponse } from '@/api/types';
import { TIPO_ENTREGA_LABELS, formatMoney } from '@/lib';
import { Button, Card, Screen, Skeleton, StatusBadge, SummaryRow, Text } from '@/components';
import { useApi, useToast } from '@/hooks';
import { ComercioHeader, RejectModal } from '../components';

const MENSAJE_ACCION: Partial<Record<ComercioPedidoAccion, string>> = {
  aceptar: 'Pedido aceptado',
  'iniciar-preparacion': 'En preparación',
  'marcar-listo': 'Marcado como listo',
  rechazar: 'Pedido rechazado, se reembolsa al cliente',
};

export function VendorPedidoDetalleScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { pedidoId } = route.params as { pedidoId: number };
  const toast = useToast();

  const fetchPedido = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<PedidoResponse>>(endpoints.comercio.pedido(pedidoId), { signal }).then(unwrap),
    [pedidoId],
  );
  const { data: pedido, loading, error, run } = useApi(fetchPedido);

  const [busy, setBusy] = useState(false);
  const [rechazar, setRechazar] = useState(false);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  async function ejecutar(accion: ComercioPedidoAccion, body?: unknown, volver = false) {
    setBusy(true);
    try {
      await api.post(endpoints.comercio.pedidoAccion(pedidoId, accion), body);
      toast.success(MENSAJE_ACCION[accion] ?? 'Listo');
      if (volver) {
        navigation.goBack();
      } else {
        run().catch(() => {});
      }
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      if (apiError.kind === 'business') {
        toast.warning('Este pedido cambió de estado, actualiza la cola');
        run().catch(() => {});
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmarRechazo(motivo: MotivoCancelacion, detalle: string) {
    const body = detalle.length > 0 ? { motivo, detalle } : { motivo };
    setRechazar(false);
    await ejecutar('rechazar', body, true);
  }

  return (
    <Screen scroll header={<ComercioHeader title="Detalle de pedido" onBack={() => navigation.goBack()} />}>
      {loading && !pedido ? (
        <SkeletonDetalle />
      ) : error && !pedido ? (
        <Card>
          <Text variant="body" color="textSecondary">
            {error.message}
          </Text>
          <View style={s.retry}>
            <Button title="Reintentar" variant="outline" onPress={() => run().catch(() => {})} />
          </View>
        </Card>
      ) : pedido ? (
        <View style={s.body}>
          <View style={s.head}>
            <View style={s.headTitle}>
              <Text variant="h2" style={s.codigo}>
                {pedido.codigo}
              </Text>
              <Text variant="small" color="textMuted">
                {TIPO_ENTREGA_LABELS[pedido.tipoEntrega]}
              </Text>
            </View>
            <StatusBadge estado={pedido.estado} />
          </View>

          <Card>
            <Text variant="sectionLabel" style={s.sectionLabel}>
              Detalle
            </Text>
            <View style={s.rows}>
              {pedido.items.map((item) => (
                <SummaryRow
                  key={item.id}
                  label={`${item.cantidad}× ${item.nombre}`}
                  value={formatMoney(item.subtotal)}
                />
              ))}
              <View style={s.divider} />
              <SummaryRow label="Tipo de entrega" value={TIPO_ENTREGA_LABELS[pedido.tipoEntrega]} />
              {pedido.descuentoQpts > 0 ? (
                <SummaryRow label="Descuento QueuePoints" value={`- ${formatMoney(pedido.descuentoQpts)}`} tone="points" />
              ) : null}
              <SummaryRow label="Total" value={formatMoney(pedido.total)} strong />
            </View>
          </Card>

          <View style={s.actions}>
            {pedido.estado === 'PAGADO_ESPERANDO_COMERCIO' ? (
              <>
                <Button title="Aceptar pedido" onPress={() => ejecutar('aceptar')} loading={busy} fullWidth />
                <Button title="Rechazar" variant="outline" onPress={() => setRechazar(true)} disabled={busy} fullWidth />
              </>
            ) : null}
            {pedido.estado === 'ACEPTADO' ? (
              <Button
                title="Iniciar preparación"
                onPress={() => ejecutar('iniciar-preparacion')}
                loading={busy}
                fullWidth
              />
            ) : null}
            {pedido.estado === 'EN_PREPARACION' ? (
              <Button title="Marcar listo" onPress={() => ejecutar('marcar-listo')} loading={busy} fullWidth />
            ) : null}
            {pedido.estado === 'LISTO_PARA_RECOGER' ? (
              <Button
                title="Marcar entregado"
                leftIcon="qrCode"
                onPress={() => navigation.navigate('CerrarEntrega', { pedidoId })}
                disabled={busy}
                fullWidth
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <RejectModal
        visible={rechazar}
        codigo={pedido?.codigo}
        onClose={() => setRechazar(false)}
        onConfirm={confirmarRechazo}
      />
    </Screen>
  );
}

function SkeletonDetalle() {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing[4] }}>
      <Skeleton width="50%" height={26} />
      <Card>
        <Skeleton width="40%" height={12} />
        <View style={{ height: t.spacing[3] }} />
        <Skeleton width="100%" height={14} />
        <View style={{ height: t.spacing[2] }} />
        <Skeleton width="90%" height={14} />
      </Card>
      <Skeleton width="100%" height={48} radius={10} />
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    body: { gap: t.spacing[4] },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[2] },
    headTitle: { gap: 1 },
    codigo: { fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
    sectionLabel: { marginBottom: t.spacing[3] },
    rows: { gap: t.spacing[2] },
    divider: { height: 1, backgroundColor: t.colors.borderDefault, marginVertical: t.spacing[1] },
    actions: { gap: t.spacing[2] },
    retry: { marginTop: t.spacing[3], alignSelf: 'flex-start' },
  });
}
