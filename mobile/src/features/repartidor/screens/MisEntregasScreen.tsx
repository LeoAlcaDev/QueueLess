import { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Card, EmptyState, LoadMore, Screen, Skeleton, StateBanner, Text } from '@/components';
import { useInfiniteList } from '@/hooks';
import { api, endpoints, unwrapPage } from '@/api';
import type { ApiResponse, PageResponse, SolicitudDeliveryResponse } from '@/api';
import { EntregaCard } from '../components';

// Historial de entregas del repartidor, paginado como scroll infinito.
export function MisEntregasScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const nav = useNavigation<any>();

  const fetchPage = useCallback(async (page: number, size: number, signal: AbortSignal) => {
    const res = await api.get<ApiResponse<PageResponse<SolicitudDeliveryResponse>>>(endpoints.repartidor.misEntregas(), {
      params: { page, size },
      signal,
    });
    return unwrapPage(res);
  }, []);

  const list = useInfiniteList<SolicitudDeliveryResponse>(fetchPage);

  if (list.loading && list.items.length === 0) {
    return (
      <Screen padded={false}>
        <View style={s.header}>
          <Text variant="h2">Mis entregas</Text>
        </View>
        <View style={s.skeletonWrap}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={s.header}>
        <Text variant="h2">Mis entregas</Text>
      </View>
      <FlatList
        data={list.items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <EntregaCard solicitud={item} />}
        contentContainerStyle={s.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={list.loadMore}
        refreshControl={
          <RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={t.colors.brand} colors={[t.colors.brand]} />
        }
        ListEmptyComponent={
          list.error ? (
            <StateBanner tone="error" title="No pudimos cargar tus entregas" message={list.error.message} action={{ label: 'Reintentar', onPress: list.refresh }} />
          ) : (
            <EmptyState
              icon="receipt"
              title="Aún no tienes entregas"
              message="Cuando completes tu primera entrega comunitaria aparecerá aquí."
              action={{ label: 'Ver solicitudes', onPress: () => nav.navigate('Disponibles') }}
            />
          )
        }
        ListFooterComponent={
          list.items.length > 0 ? <LoadMore loading={list.loadingMore} hasMore={list.hasMore} onLoadMore={list.loadMore} endLabel="No hay más entregas" /> : null
        }
      />
    </Screen>
  );
}

function SkeletonRow() {
  const t = useTheme();
  return (
    <Card padding={14}>
      <Skeleton width="55%" height={14} />
      <Skeleton width="35%" height={12} style={{ marginTop: t.spacing[2] }} />
      <Skeleton width="100%" height={12} style={{ marginTop: t.spacing[3] }} />
    </Card>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    header: { paddingHorizontal: t.spacing[4], paddingTop: t.spacing[3], paddingBottom: t.spacing[3] },
    skeletonWrap: { paddingHorizontal: t.spacing[4], gap: t.spacing[3] },
    listContent: { paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[8], gap: t.spacing[3] },
  });
}
