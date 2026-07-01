import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrap, unwrapList, unwrapPage } from '@/api';
import type {
  ApiResponse,
  OcupacionResponse,
  PageResponse,
  ProductoResponse,
  PuntoDeVentaResponse,
  ResenaResponse,
} from '@/api';
import { useApi, useInfiniteList } from '@/hooks';
import { formatRelative } from '@/lib';
import {
  Avatar,
  Card,
  ConfirmDialog,
  Icon,
  LoadMore,
  OccupancyChart,
  Price,
  Screen,
  Spinner,
  Stars,
  StateBanner,
  Text,
  WaitBadge,
} from '@/components';
import { ProductCard, ProductRowSkeleton } from '../components';
import { useCart } from '../cart/CartContext';

export function PuntoDetalleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const puntoId: number = route.params?.puntoId;
  const nombreParam: string = route.params?.nombre ?? '';
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const cart = useCart();

  const punto = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<PuntoDeVentaResponse>>(endpoints.catalogo.punto(puntoId), { signal });
      return unwrap(res);
    }, [puntoId]),
  );
  const productos = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<ProductoResponse[]>>(endpoints.catalogo.productos(puntoId), { signal });
      return unwrapList(res);
    }, [puntoId]),
  );
  const ocupacion = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<OcupacionResponse>>(endpoints.cliente.ocupacion(puntoId), { signal });
      return unwrap(res);
    }, [puntoId]),
  );

  useEffect(() => {
    punto.run().catch(() => {});
    productos.run().catch(() => {});
    ocupacion.run().catch(() => {});
  }, [punto.run, productos.run, ocupacion.run]);

  const fetchResenas = useCallback(
    (page: number, size: number, signal: AbortSignal) =>
      api
        .get<ApiResponse<PageResponse<ResenaResponse>>>(endpoints.catalogo.resenasPunto(puntoId), {
          params: { page, size },
          signal,
        })
        .then(unwrapPage),
    [puntoId],
  );
  const resenas = useInfiniteList(fetchResenas, 5);

  const nombre = punto.data?.nombre ?? nombreParam;
  const [pending, setPending] = useState<ProductoResponse | null>(null);

  const productosList = productos.data ?? [];
  const categorias = useMemo(() => {
    const set: string[] = [];
    for (const p of productosList) if (!set.includes(p.categoria)) set.push(p.categoria);
    return set;
  }, [productosList]);

  function addProduct(product: ProductoResponse) {
    if (cart.belongsToOtherPunto(puntoId)) {
      setPending(product);
      return;
    }
    cart.add(
      { id: puntoId, nombre },
      { productoId: product.id, nombre: product.nombre, precio: product.precio, fotoUrl: product.fotoUrl },
    );
  }

  function confirmReplace() {
    if (!pending) return;
    cart.clear();
    cart.add(
      { id: puntoId, nombre },
      { productoId: pending.id, nombre: pending.nombre, precio: pending.precio, fotoUrl: pending.fotoUrl },
    );
    setPending(null);
  }

  function openProduct(product: ProductoResponse) {
    navigation.navigate('ProductoDetalle', { producto: product, punto: { id: puntoId, nombre } });
  }

  const carritoActivo = cart.count > 0 && cart.puntoDeVentaId === puntoId;
  const footer = carritoActivo ? (
    <Pressable onPress={() => navigation.navigate('Checkout')} style={s.cartBar}>
      <View style={s.cartCount}>
        <Text variant="badge" style={{ color: t.colors.onBrand }}>
          {cart.count}
        </Text>
      </View>
      <Text variant="label" style={[s.cartText, { color: t.colors.onBrand }]}>
        Ver carrito
      </Text>
      <Text variant="label" style={{ color: t.colors.onBrand, fontVariant: ['tabular-nums'] }}>
        {`S/ ${cart.subtotal.toFixed(2)}`}
      </Text>
    </Pressable>
  ) : undefined;

  return (
    <Screen scroll padded={false} footer={footer}>
      <View style={s.band}>
        <Icon name="coffee" size={64} color={t.colors.textBrand} strokeWidth={1.2} />
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={s.bandBack}>
          <Icon name="chevronLeft" size={22} color="#fff" />
        </Pressable>
        <View style={s.bandBadges}>
          {punto.data ? (
            <View style={s.openPill}>
              <View
                style={[s.dot, { backgroundColor: punto.data.abierto ? t.colors.accent : t.colors.textMuted }]}
              />
              <Text variant="badge" color="textPrimary">
                {punto.data.abierto ? 'Abierto' : 'Cerrado'}
              </Text>
            </View>
          ) : null}
          {punto.data?.tiempoEsperaEstimado != null ? (
            <WaitBadge minutes={punto.data.tiempoEsperaEstimado} />
          ) : null}
        </View>
      </View>

      <View style={s.content}>
        <View>
          <Text variant="h2">{nombre || ' '}</Text>
          {punto.data ? (
            <View style={s.metaRow}>
              <View style={s.meta}>
                <Icon name="mapPin" size={13} color={t.colors.textSecondary} />
                <Text variant="small" color="textSecondary">
                  {punto.data.ubicacion}
                </Text>
              </View>
              <View style={s.meta}>
                <Icon name="clock" size={13} color={t.colors.textSecondary} />
                <Text variant="small" color="textSecondary">
                  {`${punto.data.horarioApertura} – ${punto.data.horarioCierre}`}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {productos.loading ? (
          <View style={s.menuLoading}>
            {[0, 1, 2].map((i) => (
              <ProductRowSkeleton key={i} />
            ))}
          </View>
        ) : productos.error ? (
          <StateBanner
            tone="error"
            title="No pudimos cargar el menú"
            message={productos.error.message}
            action={{ label: 'Reintentar', onPress: () => productos.run().catch(() => {}) }}
          />
        ) : (
          categorias.map((cat) => (
            <View key={cat} style={s.section}>
              <Text variant="h3">{cat}</Text>
              <View style={s.menuList}>
                {productosList
                  .filter((p) => p.categoria === cat)
                  .map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      qty={cart.puntoDeVentaId === puntoId ? cart.qtyOf(product.id) : 0}
                      onAdd={() => addProduct(product)}
                      onSetQty={(qty) => cart.setQty(product.id, qty)}
                      onOpen={() => openProduct(product)}
                    />
                  ))}
              </View>
            </View>
          ))
        )}

        <Card>
          <Text variant="sectionLabel" style={s.cardLabel}>
            Ocupación por hora
          </Text>
          {ocupacion.loading ? (
            <View style={s.center}>
              <Spinner />
            </View>
          ) : (
            <OccupancyChart
              franjas={ocupacion.data?.franjas ?? []}
              horaActual={new Date().getHours()}
              hayDatosSuficientes={ocupacion.data?.hayDatosSuficientes ?? false}
            />
          )}
        </Card>

        <Card>
          <Text variant="sectionLabel" style={s.cardLabel}>
            Reseñas
          </Text>
          {resenas.loading ? (
            <View style={s.center}>
              <Spinner />
            </View>
          ) : resenas.items.length === 0 ? (
            <Text variant="small" color="textMuted">
              Este local todavía no tiene reseñas.
            </Text>
          ) : (
            <View style={s.reviews}>
              {resenas.items.map((r) => (
                <View key={r.id} style={s.review}>
                  <Avatar name={r.autorNombre} size={34} />
                  <View style={s.reviewBody}>
                    <View style={s.reviewHead}>
                      <Text variant="label" color="textPrimary">
                        {r.autorNombre}
                      </Text>
                      <Stars value={r.calificacion} size={12} />
                    </View>
                    {r.comentario ? (
                      <Text variant="small" color="textSecondary">
                        {r.comentario}
                      </Text>
                    ) : null}
                    <Text variant="small" color="textMuted">
                      {formatRelative(r.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
              <LoadMore loading={resenas.loadingMore} hasMore={resenas.hasMore} onLoadMore={resenas.loadMore} />
            </View>
          )}
        </Card>
      </View>

      <ConfirmDialog
        visible={pending !== null}
        title="¿Vaciar tu carrito?"
        message="Tu carrito tiene productos de otro local. Para pedir de aquí, vaciaremos lo anterior."
        confirmLabel="Vaciar y agregar"
        cancelLabel="Conservar"
        destructive
        onConfirm={confirmReplace}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    band: { height: 170, backgroundColor: t.colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
    bandBack: {
      position: 'absolute',
      top: 12,
      left: 12,
      width: 38,
      height: 38,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.bgOverlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bandBadges: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', gap: t.spacing[1] },
    openPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.bgSurface,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
    },
    dot: { width: 6, height: 6, borderRadius: t.radii.pill },
    content: { padding: t.spacing[4], gap: t.spacing[6] },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3], marginTop: t.spacing[2] },
    meta: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] },
    menuLoading: { gap: t.spacing[4] },
    section: { gap: t.spacing[3] },
    menuList: { gap: t.spacing[2] },
    cardLabel: { marginBottom: t.spacing[3] },
    center: { paddingVertical: t.spacing[6], alignItems: 'center' },
    reviews: { gap: t.spacing[3] },
    review: { flexDirection: 'row', gap: t.spacing[3] },
    reviewBody: { flex: 1, gap: 2 },
    reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[2] },
    cartBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[3],
      backgroundColor: t.colors.brandStrong,
      borderRadius: t.radii.button,
      paddingVertical: t.spacing[3],
      paddingHorizontal: t.spacing[4],
    },
    cartCount: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: 8,
      borderRadius: t.radii.pill,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartText: { flex: 1 },
  });
}
