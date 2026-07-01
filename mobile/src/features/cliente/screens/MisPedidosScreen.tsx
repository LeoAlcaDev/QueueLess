import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrapPage } from '@/api';
import type { ApiResponse, EstadoPedido, PageResponse, PedidoEstadoEvent, PedidoResponse } from '@/api';
import { useEventStream, useInfiniteList } from '@/hooks';
import {
  EmptyState,
  LoadMore,
  Screen,
  Segmented,
  StateBanner,
  Text,
} from '@/components';
import { OrderCard, OrderCardSkeleton } from '../components';

const ACTIVOS: EstadoPedido[] = [
  'PENDIENTE_PAGO',
  'PAGADO_BUSCANDO_REPARTIDOR',
  'PAGADO_ESPERANDO_COMERCIO',
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO_PARA_RECOGER',
  'LISTO_PARA_DELIVERY',
];

function matchesTab(estado: EstadoPedido, tab: string): boolean {
  if (tab === 'activos') return ACTIVOS.includes(estado);
  if (tab === 'entregados') return estado === 'ENTREGADO';
  return estado.startsWith('CANCELADO') || estado === 'EXPIRADO';
}

export function MisPedidosScreen() {
  const navigation = useNavigation<any>();
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState('activos');

  const fetchPedidos = useCallback(
    (page: number, size: number, signal: AbortSignal) =>
      api
        .get<ApiResponse<PageResponse<PedidoResponse>>>(endpoints.cliente.pedidos(), {
          params: { page, size },
          signal,
        })
        .then(unwrapPage),
    [],
  );
  const lista = useInfiniteList(fetchPedidos);

  // el backend empuja cada cambio de estado; parcheamos el pedido en la lista sin recargar
  const onEvent = useCallback(
    (event: PedidoEstadoEvent) => {
      lista.patch(
        (it) => it.id === event.pedidoId,
        (it) => ({ ...it, estado: event.estadoNuevo as EstadoPedido }),
      );
    },
    [lista],
  );
  useEventStream<PedidoEstadoEvent>(endpoints.cliente.pedidosStream(), { onEvent });

  const visibles = useMemo(
    () => lista.items.filter((p) => matchesTab(p.estado, tab)),
    [lista.items, tab],
  );

  const refresh = (
    <RefreshControl refreshing={lista.refreshing} onRefresh={lista.refresh} tintColor={t.colors.brand} />
  );

  return (
    <Screen scroll padded={false} refreshControl={refresh}>
      <View style={s.content}>
        <Text variant="h2">Mis pedidos</Text>
        <Segmented
          fullWidth
          value={tab}
          onChange={setTab}
          options={[
            { label: 'Activos', value: 'activos' },
            { label: 'Entregados', value: 'entregados' },
            { label: 'Cancelados', value: 'cancelados' },
          ]}
        />

        {lista.loading ? (
          <View style={s.list}>
            {[0, 1, 2].map((i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </View>
        ) : lista.error ? (
          <StateBanner
            tone="error"
            title="No pudimos cargar tus pedidos"
            message={lista.error.message}
            action={{ label: 'Reintentar', onPress: lista.refresh }}
          />
        ) : visibles.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="Aún no tienes pedidos"
            message="Cuando hagas tu primer pedido aparecerá aquí con su estado en vivo."
            action={{ label: 'Explorar locales', onPress: () => navigation.navigate('Inicio', { screen: 'Home' }) }}
          />
        ) : (
          <View style={s.list}>
            {visibles.map((pedido) => (
              <OrderCard
                key={pedido.id}
                pedido={pedido}
                onPress={() => navigation.navigate('Seguimiento', { pedidoId: pedido.id })}
              />
            ))}
            <LoadMore loading={lista.loadingMore} hasMore={lista.hasMore} onLoadMore={lista.loadMore} />
          </View>
        )}
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4], gap: t.spacing[4] },
    list: { gap: t.spacing[3] },
  });
}
