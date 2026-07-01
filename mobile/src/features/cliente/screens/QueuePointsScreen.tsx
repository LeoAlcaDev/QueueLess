import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrap, unwrapPage } from '@/api';
import type { ApiResponse, MovimientoResponse, PageResponse, SaldoResponse } from '@/api';
import { useApi, useInfiniteList } from '@/hooks';
import { MOVIMIENTO_LABELS, formatRelative } from '@/lib';
import { Card, Icon, LoadMore, Screen, Spinner, StateBanner, Text } from '@/components';

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
  useEffect(() => {
    saldo.run().catch(() => {});
  }, [saldo.run]);

  const fetchMovimientos = useCallback(
    (page: number, size: number, signal: AbortSignal) =>
      api
        .get<ApiResponse<PageResponse<MovimientoResponse>>>(endpoints.queuepoints.movimientos(), {
          params: { page, size },
          signal,
        })
        .then(unwrapPage),
    [],
  );
  const movimientos = useInfiniteList(fetchMovimientos);

  function refrescar() {
    saldo.run().catch(() => {});
    movimientos.refresh();
  }

  const refresh = (
    <RefreshControl refreshing={movimientos.refreshing} onRefresh={refrescar} tintColor={t.colors.brand} />
  );

  return (
    <Screen scroll padded={false} refreshControl={refresh}>
      <View style={s.content}>
        <View
          style={s.hero}
          onLayout={(e) => setHeroSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          {/* medimos el alto real del bloque: con height="100%" el SVG queda corto en
              una caja que crece con el texto y el degradado dejaba afuera la última línea */}
          {heroSize.width > 0 ? (
            <Svg style={StyleSheet.absoluteFill} width={heroSize.width} height={heroSize.height}>
              <Defs>
                <LinearGradient id="qpts" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={t.colors.points} />
                  <Stop offset="1" stopColor={t.colors.pointsStrong} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={heroSize.width} height={heroSize.height} fill="url(#qpts)" />
            </Svg>
          ) : null}
          <View style={s.heroLabel}>
            <Icon name="bolt" size={14} color="#fff" />
            <Text variant="sectionLabel" style={s.heroLabelText}>
              Mis QueuePoints
            </Text>
          </View>
          <Text variant="display" style={s.heroValue}>
            {saldo.data?.saldo ?? 0}
          </Text>
          <Text variant="small" style={s.heroSub}>
            Ganas 50 QueuePoints por cada entrega comunitaria.
          </Text>
        </View>

        <Card padding={16}>
          <View style={s.howto}>
            <View style={s.howtoIcon}>
              <Icon name="bike" size={20} color={t.colors.pointsStrong} />
            </View>
            <View style={s.howtoBody}>
              <Text variant="label" color="textPrimary">
                ¿Cómo ganas QueuePoints?
              </Text>
              <Text variant="small" color="textSecondary">
                Gana 50 QueuePoints cada vez que completas una entrega comunitaria para otro estudiante. Son tu
                reputación en el campus; no se canjean por dinero.
              </Text>
            </View>
          </View>
        </Card>

        <View style={s.block}>
          <Text variant="sectionLabel" style={s.blockLabel}>
            Movimientos
          </Text>
          {movimientos.loading ? (
            <View style={s.center}>
              <Spinner />
            </View>
          ) : movimientos.error ? (
            <StateBanner
              tone="error"
              title="No pudimos cargar tus movimientos"
              message={movimientos.error.message}
              action={{ label: 'Reintentar', onPress: movimientos.refresh }}
            />
          ) : movimientos.items.length === 0 ? (
            <Card padding={16}>
              <Text variant="small" color="textMuted">
                Todavía no tienes movimientos. Empieza a hacer entregas comunitarias para ganar QueuePoints.
              </Text>
            </Card>
          ) : (
            <Card padding={0}>
              {movimientos.items.map((mov, index) => {
                const ganado = mov.tipo === 'GANADO';
                return (
                  <View key={mov.id} style={[s.row, index > 0 && s.rowBorder]}>
                    <View style={[s.rowIcon, { backgroundColor: ganado ? t.colors.pointsSoft : t.colors.bgSurface2 }]}>
                      <Icon
                        name={ganado ? 'bolt' : 'tag'}
                        size={16}
                        color={ganado ? t.colors.pointsStrong : t.colors.textMuted}
                      />
                    </View>
                    <View style={s.rowInfo}>
                      <Text variant="label" color="textPrimary" numberOfLines={1}>
                        {mov.descripcion ?? MOVIMIENTO_LABELS[mov.tipo]}
                      </Text>
                      <Text variant="small" color="textMuted">
                        {MOVIMIENTO_LABELS[mov.tipo]} · {formatRelative(mov.createdAt)}
                      </Text>
                    </View>
                    <Text
                      variant="label"
                      color={ganado ? 'pointsStrong' : 'textSecondary'}
                      style={s.amount}
                    >
                      {ganado ? `+${mov.monto}` : `-${mov.monto}`}
                    </Text>
                  </View>
                );
              })}
            </Card>
          )}
          {!movimientos.loading && movimientos.items.length > 0 ? (
            <LoadMore loading={movimientos.loadingMore} hasMore={movimientos.hasMore} onLoadMore={movimientos.loadMore} />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4], gap: t.spacing[4] },
    // único gradiente permitido: el hero de QueuePoints. El color sólido va de
    // respaldo por si el degradado aún no midió, así nunca se ve un hueco
    hero: { borderRadius: t.radii.card, padding: t.spacing[6], overflow: 'hidden', backgroundColor: t.colors.pointsStrong, ...t.shadow.md },
    heroLabel: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] },
    heroLabelText: { color: '#fff' },
    heroValue: { color: '#fff', fontSize: 46, lineHeight: 50, fontVariant: ['tabular-nums'], marginTop: t.spacing[1] },
    heroSub: { color: '#fff', opacity: 0.92 },
    howto: { flexDirection: 'row', gap: t.spacing[3], alignItems: 'flex-start' },
    howtoIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: t.colors.pointsSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    howtoBody: { flex: 1, gap: 2 },
    block: { gap: t.spacing[2] },
    blockLabel: { marginBottom: t.spacing[1] },
    center: { paddingVertical: t.spacing[8], alignItems: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingVertical: 13, paddingHorizontal: t.spacing[4] },
    rowBorder: { borderTopWidth: 1, borderTopColor: t.colors.borderDefault },
    rowIcon: { width: 34, height: 34, borderRadius: t.radii.pill, alignItems: 'center', justifyContent: 'center' },
    rowInfo: { flex: 1, minWidth: 0 },
    amount: { fontVariant: ['tabular-nums'] },
  });
}
