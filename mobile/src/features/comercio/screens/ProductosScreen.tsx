import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ApiError, api, endpoints, normalizeError, unwrapList } from '@/api';
import type { ApiResponse, CambiarDisponibilidadRequest, ProductoResponse, PuntoDeVentaResponse } from '@/api/types';
import { formatMoney } from '@/lib';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FoodThumb,
  Screen,
  Select,
  Skeleton,
  Text,
  Toggle,
} from '@/components';
import { useApi, useToast } from '@/hooks';
import { IconButton } from '../components';

export function ProductosScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();

  const fetchLocales = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<PuntoDeVentaResponse[]>>(endpoints.comercio.pdv(), { signal }).then(unwrapList),
    [],
  );
  const locales = useApi(fetchLocales);

  const fetchProductos = useCallback(
    (signal: AbortSignal, puntoDeVentaId: number) =>
      api
        .get<ApiResponse<ProductoResponse[]>>(endpoints.comercio.productos(), { params: { puntoDeVentaId }, signal })
        .then(unwrapList),
    [],
  );
  const productos = useApi(fetchProductos);

  const [pdvId, setPdvId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [borrar, setBorrar] = useState<ProductoResponse | null>(null);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    locales.run().catch(() => {});
  }, [locales.run]);

  // al cargar los locales elegimos el primero por defecto
  useEffect(() => {
    if (pdvId == null && locales.data && locales.data.length > 0) {
      setPdvId(locales.data[0].id);
    }
  }, [locales.data, pdvId]);

  const cargarProductos = useCallback(() => {
    if (pdvId != null) productos.run(pdvId).catch(() => {});
  }, [pdvId, productos.run]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  async function alternarDisponible(producto: ProductoResponse) {
    setTogglingId(producto.id);
    try {
      const body: CambiarDisponibilidadRequest = { disponible: !producto.disponible };
      await api.patch(endpoints.comercio.productoDisponibilidad(producto.id), body);
      cargarProductos();
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      toast.error(apiError.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmarBorrado() {
    if (!borrar) return;
    setBorrando(true);
    try {
      await api.delete(endpoints.comercio.productoById(borrar.id));
      toast.success('Producto eliminado');
      cargarProductos();
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      toast.error(apiError.message);
    } finally {
      setBorrando(false);
      setBorrar(null);
    }
  }

  const sinLocales = !locales.loading && (locales.data?.length ?? 0) === 0;
  const lista = productos.data ?? [];

  return (
    <Screen scroll>
      <View style={s.header}>
        <Text variant="h2">Productos</Text>
        {pdvId != null ? (
          <Button
            title="Nuevo"
            size="sm"
            leftIcon="plus"
            onPress={() => navigation.navigate('ProductoEditor', { puntoDeVentaId: pdvId })}
          />
        ) : null}
      </View>

      {sinLocales ? (
        <EmptyState
          icon="store"
          title="Aún no tienes locales"
          message="Crea un punto de venta en la pestaña Locales para empezar a cargar productos."
        />
      ) : (
        <>
          {locales.data && locales.data.length > 0 ? (
            <View style={s.selector}>
              <Select
                label="Local"
                value={pdvId != null ? String(pdvId) : null}
                onChange={(value) => setPdvId(Number(value))}
                options={locales.data.map((local) => ({ value: String(local.id), label: local.nombre }))}
              />
            </View>
          ) : null}

          {productos.loading && !productos.data ? (
            <SkeletonProductos />
          ) : lista.length === 0 ? (
            <EmptyState
              icon="tag"
              title="Sin productos todavía"
              message="Agrega tu primer producto para este local."
              action={pdvId != null ? { label: 'Nuevo producto', onPress: () => navigation.navigate('ProductoEditor', { puntoDeVentaId: pdvId }) } : undefined}
            />
          ) : (
            <View style={s.list}>
              {lista.map((producto) => (
                <Card key={producto.id} padding={12}>
                  <View style={s.row}>
                    <FoodThumb uri={producto.fotoUrl} size={52} radius={t.radii.input} />
                    <View style={s.info}>
                      <Text variant="label" numberOfLines={1}>
                        {producto.nombre}
                      </Text>
                      <Text variant="small" color="textMuted">
                        {producto.categoria} · {formatMoney(producto.precio)}
                      </Text>
                    </View>
                    <Toggle
                      value={producto.disponible}
                      onValueChange={() => alternarDisponible(producto)}
                      disabled={togglingId === producto.id}
                    />
                  </View>
                  <View style={s.acciones}>
                    <IconButton
                      icon="edit"
                      label="Editar producto"
                      onPress={() =>
                        navigation.navigate('ProductoEditor', { puntoDeVentaId: pdvId as number, productoId: producto.id })
                      }
                    />
                    <IconButton icon="trash" tone="danger" label="Borrar producto" onPress={() => setBorrar(producto)} />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </>
      )}

      <ConfirmDialog
        visible={!!borrar}
        title={borrar ? `¿Borrar ${borrar.nombre}?` : '¿Borrar producto?'}
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar producto"
        destructive
        loading={borrando}
        onConfirm={confirmarBorrado}
        onCancel={() => setBorrar(null)}
      />
    </Screen>
  );
}

function SkeletonProductos() {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing[2] }}>
      {[0, 1, 2].map((i) => (
        <Card key={i} padding={12}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
            <Skeleton width={52} height={52} radius={t.radii.input} />
            <View style={{ flex: 1, gap: t.spacing[2] }}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing[3] },
    selector: { marginBottom: t.spacing[3] },
    list: { gap: t.spacing[2] },
    row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    info: { flex: 1, gap: 2 },
    acciones: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: t.spacing[2],
      marginTop: t.spacing[3],
      paddingTop: t.spacing[3],
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
    },
  });
}
