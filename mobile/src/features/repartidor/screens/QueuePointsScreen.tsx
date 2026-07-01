import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Card, Icon, LoadMore, Screen, Skeleton, StateBanner, Text } from '@/components';
import { useApi, useInfiniteList } from '@/hooks';
import { api, endpoints, unwrap, unwrapPage } from '@/api';
import type { ApiResponse, MovimientoResponse, PageResponse, SaldoResponse } from '@/api';
import { formatDateTime, MOVIMIENTO_LABELS } from '@/lib';

// QueuePoints ganados por el repartidor (50 por entrega completada). El hero usa el
// único gradiente permitido del sistema —violeta— y abajo va el historial de
// movimientos paginado.
export function QueuePointsScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [heroSize, setHeroSize] = useState({ width: 0, height: 0 });

  const saldo = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<SaldoResponse>>(endpoints.queuepoints.saldo(), { signal });
      return unwrap(res);
    }, []),
  );

  const fetchPage = useCallback(async (page: number, size: number, signal: AbortSignal) => {
    const res = await api.get<ApiResponse<PageResponse<MovimientoResponse>>>(endpoints.queuepoints.movimientos(), {
      params: { page, size },
      signal,
    });
    return unwrapPage(res);
  }, []);

  const movimientos = useInfiniteList<MovimientoResponse>(fetchPage);

  useEffect(() => {
    saldo.run().catch(() => {});
  }, [saldo.run]);

  function refrescar() {
    saldo.run().catch(() => {});
    movimientos.refresh();
  }

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={movimientos.refreshing} onRefresh={refrescar} tintColor={t.colors.brand} colors={[t.colors.brand]} />
      }
    >
      <View
        style={s.hero}
        onLayout={(e) => setHeroSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {/* medimos el alto real: con height="100%" el SVG queda corto en una caja que
            crece con el texto y el degradado recortaba la última línea */}
        {heroSize.width > 0 ? (
          <Svg style={StyleSheet.absoluteFill} width={heroSize.width} height={heroSize.height}>
            <Defs>
              <SvgLinearGradient id="qpHero" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={t.colors.points} />
                <Stop offset="1" stopColor={t.colors.pointsStrong} />
              </SvgLinearGradient>
            </Defs>
            <Rect x={0} y={0} width={heroSize.width} height={heroSize.height} fill="url(#qpHero)" />
          </Svg>
        ) : null}
        <View style={s.heroLabel}>
          <Icon name="bolt" size={14} color={t.colors.textInverse} />
          <Text variant="sectionLabel" color="textInverse">
            QueuePoints ganados
          </Text>
        </View>
        {saldo.data ? (
          <Text color="textInverse" style={s.heroSaldo}>
            {String(saldo.data.saldo)}
          </Text>
        ) : (
          <Skeleton width={120} height={46} style={s.heroSkeleton} />
        )}
        <Text color="textInverse" style={s.heroSub}>
          Ganas 50 por cada entrega que completas
        </Text>
      </View>

      <Text variant="sectionLabel" style={s.movLabel}>
        Movimientos
      </Text>

      {movimientos.loading && movimientos.items.length === 0 ? (
        <Card padding={0}>
          <MovSkeleton />
          <MovSkeleton divider />
          <MovSkeleton divider />
        </Card>
      ) : movimientos.error && movimientos.items.length === 0 ? (
        <StateBanner tone="error" title="No pudimos cargar tus movimientos" message={movimientos.error.message} action={{ label: 'Reintentar', onPress: movimientos.refresh }} />
      ) : movimientos.items.length === 0 ? (
        <Card padding={16}>
          <Text variant="small" color="textSecondary" align="center">
            Todavía no tienes movimientos. Completa una entrega para ganar tus primeros puntos.
          </Text>
        </Card>
      ) : (
        <Card padding={0}>
          {movimientos.items.map((mov, i) => (
            <View key={mov.id} style={[s.movRow, i > 0 && s.movDivider]}>
              <View style={s.movLeft}>
                <View style={s.movIcon}>
                  <Icon name="bolt" size={16} color={t.colors.pointsStrong} />
                </View>
                <View style={s.movTextos}>
                  <Text variant="small" color="textPrimary" style={s.movDesc} numberOfLines={1}>
                    {mov.descripcion ?? MOVIMIENTO_LABELS[mov.tipo]}
                  </Text>
                  <Text variant="badge" color="textMuted">
                    {`${MOVIMIENTO_LABELS[mov.tipo]} · ${formatDateTime(mov.createdAt)}`}
                  </Text>
                </View>
              </View>
              <Text variant="label" style={s.movMonto}>
                {`${mov.monto >= 0 ? '+' : ''}${mov.monto}`}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {movimientos.items.length > 0 ? (
        <LoadMore loading={movimientos.loadingMore} hasMore={movimientos.hasMore} onLoadMore={movimientos.loadMore} endLabel="No hay más movimientos" />
      ) : null}
    </Screen>
  );
}

function MovSkeleton({ divider }: { divider?: boolean }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={[s.movRow, divider && s.movDivider]}>
      <View style={s.movLeft}>
        <Skeleton width={34} height={34} radius={t.radii.pill} />
        <View style={s.movTextos}>
          <Skeleton width={160} height={13} />
          <Skeleton width={100} height={11} style={{ marginTop: 4 }} />
        </View>
      </View>
      <Skeleton width={36} height={14} />
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    hero: {
      borderRadius: t.radii.card,
      overflow: 'hidden',
      paddingVertical: t.spacing[6],
      paddingHorizontal: t.spacing[6],
      backgroundColor: t.colors.pointsStrong,
      ...t.shadow.md,
    },
    heroLabel: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2], opacity: 0.9 },
    heroSaldo: {
      fontFamily: t.fontFamily.bold,
      fontSize: 46,
      lineHeight: 50,
      letterSpacing: -0.9,
      marginTop: t.spacing[1],
      fontVariant: ['tabular-nums'],
    },
    heroSkeleton: { marginTop: t.spacing[2], marginBottom: t.spacing[1], opacity: 0.4 },
    heroSub: { fontFamily: t.fontFamily.regular, fontSize: 14, opacity: 0.92 },
    movLabel: { marginTop: t.spacing[6], marginBottom: t.spacing[3] },
    movRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing[2],
      paddingVertical: t.spacing[3],
      paddingHorizontal: t.spacing[4],
    },
    movDivider: { borderTopWidth: 1, borderTopColor: t.colors.borderDefault },
    movLeft: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], flex: 1, minWidth: 0 },
    movIcon: {
      width: 34,
      height: 34,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.pointsSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    movTextos: { flex: 1, minWidth: 0 },
    movDesc: { fontFamily: t.fontFamily.semibold },
    movMonto: { color: t.colors.pointsStrong, fontVariant: ['tabular-nums'] },
  });
}
