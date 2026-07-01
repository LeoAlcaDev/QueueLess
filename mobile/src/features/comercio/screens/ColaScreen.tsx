import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import {
  ApiError,
  api,
  endpoints,
  normalizeError,
  unwrapList,
  type ComercioPedidoAccion,
} from '@/api';
import type { ApiResponse, EstadoPedido, MotivoCancelacion, PedidoEstadoEvent, PedidoResponse } from '@/api/types';
import { Card, EmptyState, MetricCard, Screen, Skeleton, StateBanner, Text } from '@/components';
import { useApi, useEventStream, useToast } from '@/hooks';
import { QueueCard, RejectModal } from '../components';

interface Columna {
  key: string;
  label: string;
  match: (estado: EstadoPedido) => boolean;
}

// Columnas de la cola, equivalentes al kanban de la versión web. En móvil se
// recorren como pestañas para caber en pantalla angosta.
const COLUMNAS: Columna[] = [
  { key: 'PAGADO_ESPERANDO_COMERCIO', label: 'Por aceptar', match: (e) => e === 'PAGADO_ESPERANDO_COMERCIO' },
  { key: 'ACEPTADO', label: 'Aceptados', match: (e) => e === 'ACEPTADO' },
  { key: 'EN_PREPARACION', label: 'En preparación', match: (e) => e === 'EN_PREPARACION' },
  { key: 'LISTO', label: 'Listos', match: (e) => e.startsWith('LISTO') },
];

const MENSAJE_ACCION: Record<ComercioPedidoAccion, string> = {
  aceptar: 'Pedido aceptado',
  'iniciar-preparacion': 'En preparación',
  'marcar-listo': 'Marcado como listo',
  'marcar-entregado': 'Pedido entregado',
  rechazar: 'Pedido rechazado, se reembolsa al cliente',
  cancelar: 'Pedido cancelado',
};

export function ColaScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();

  const fetchCola = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<PedidoResponse[]>>(endpoints.comercio.cola(), { signal }).then(unwrapList),
    [],
  );
  const { data, loading, error, run } = useApi(fetchCola);

  const [tab, setTab] = useState(COLUMNAS[0].key);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rechazar, setRechazar] = useState<PedidoResponse | null>(null);
  const [rechazando, setRechazando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  // refresca la cola en vivo: cada cambio de estado del backend llega por SSE
  const { connected } = useEventStream<PedidoEstadoEvent>(endpoints.comercio.pedidosStream(), {
    onEvent: () => {
      run().catch(() => {});
    },
  });

  const pedidos = data ?? [];
  const enCola = pedidos.filter((p) => p.estado === 'PAGADO_ESPERANDO_COMERCIO').length;
  const enCurso = pedidos.filter(
    (p) => p.estado === 'ACEPTADO' || p.estado === 'EN_PREPARACION' || p.estado.startsWith('LISTO'),
  ).length;

  const columnaActiva = COLUMNAS.find((c) => c.key === tab) ?? COLUMNAS[0];
  const visibles = pedidos.filter((p) => columnaActiva.match(p.estado));

  async function ejecutar(pedido: PedidoResponse, accion: ComercioPedidoAccion, body?: unknown) {
    setBusyId(pedido.id);
    try {
      await api.post(endpoints.comercio.pedidoAccion(pedido.id, accion), body);
      toast.success(MENSAJE_ACCION[accion]);
      run().catch(() => {});
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      // 422: el pedido cambió de estado entre que se mostró y se actuó; refrescamos
      if (apiError.kind === 'business') {
        toast.warning('Este pedido cambió de estado, actualiza la cola');
        run().catch(() => {});
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function confirmarRechazo(motivo: MotivoCancelacion, detalle: string) {
    if (!rechazar) return;
    setRechazando(true);
    const body = detalle.length > 0 ? { motivo, detalle } : { motivo };
    await ejecutar(rechazar, 'rechazar', body);
    setRechazando(false);
    setRechazar(null);
  }

  async function onRefresh() {
    setRefreshing(true);
    await run().catch(() => {});
    setRefreshing(false);
  }

  function cardProps(pedido: PedidoResponse) {
    return {
      pedido,
      busy: busyId === pedido.id,
      onOpen: () => navigation.navigate('PedidoDetalle', { pedidoId: pedido.id }),
      onAceptar: () => ejecutar(pedido, 'aceptar'),
      onRechazar: () => setRechazar(pedido),
      onIniciar: () => ejecutar(pedido, 'iniciar-preparacion'),
      onListo: () => ejecutar(pedido, 'marcar-listo'),
      onEntregar: () => navigation.navigate('CerrarEntrega', { pedidoId: pedido.id }),
    };
  }

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.brand} />}
    >
      <View style={s.header}>
        <Text variant="h2">Cola de pedidos</Text>
        <View style={s.live}>
          <View style={[s.liveDot, { backgroundColor: connected ? t.colors.accent : t.colors.textMuted }]} />
          <Text variant="small" color={connected ? 'accentText' : 'textMuted'}>
            {connected ? 'En vivo' : 'Conectando…'}
          </Text>
        </View>
      </View>

      <View style={s.metrics}>
        <MetricCard icon="clock" value={loading ? '·' : enCola} label="En cola" tone="warning" />
        <MetricCard icon="receipt" value={loading ? '·' : enCurso} label="En curso" tone="brand" />
      </View>

      {error ? (
        <View style={s.banner}>
          <StateBanner
            tone="warning"
            title="No pudimos cargar la cola"
            message={error.message}
            action={{ label: 'Reintentar', onPress: () => run().catch(() => {}) }}
          />
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
        {COLUMNAS.map((columna) => {
          const total = pedidos.filter((p) => columna.match(p.estado)).length;
          const activo = columna.key === tab;
          return (
            <Pressable
              key={columna.key}
              onPress={() => setTab(columna.key)}
              style={[s.tab, activo ? s.tabActive : s.tabIdle]}
            >
              <Text variant="label" color={activo ? 'textBrand' : 'textSecondary'}>
                {columna.label} · {total}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.list}>
        {loading && !data ? (
          <SkeletonList />
        ) : visibles.length === 0 ? (
          <EmptyState icon="layoutGrid" title="Sin pedidos aquí" message="Esta columna está vacía por ahora." />
        ) : (
          visibles.map((pedido) => <QueueCard key={pedido.id} {...cardProps(pedido)} />)
        )}
      </View>

      <RejectModal
        visible={!!rechazar}
        codigo={rechazar?.codigo}
        loading={rechazando}
        onClose={() => setRechazar(null)}
        onConfirm={confirmarRechazo}
      />
    </Screen>
  );
}

// Esqueleto propio de la cola: bloques que se distinguen del contenido poblado.
function SkeletonList() {
  const t = useTheme();
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Card key={i} padding={13}>
          <Skeleton width="42%" height={14} />
          <View style={{ height: t.spacing[2] }} />
          <Skeleton width="80%" height={12} />
          <View style={{ height: t.spacing[3] }} />
          <Skeleton width="100%" height={34} radius={10} />
        </Card>
      ))}
    </>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing[3] },
    live: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] },
    liveDot: { width: 7, height: 7, borderRadius: t.radii.pill },
    metrics: { flexDirection: 'row', gap: t.spacing[2], marginBottom: t.spacing[3] },
    banner: { marginBottom: t.spacing[3] },
    tabs: { gap: t.spacing[2], paddingBottom: t.spacing[3] },
    tab: { paddingVertical: t.spacing[2], paddingHorizontal: t.spacing[3], borderRadius: t.radii.pill, borderWidth: 1 },
    tabActive: { backgroundColor: t.colors.brandSoft, borderColor: t.colors.brand },
    tabIdle: { backgroundColor: t.colors.bgSurface, borderColor: t.colors.borderDefault },
    list: { gap: t.spacing[2] },
  });
}
