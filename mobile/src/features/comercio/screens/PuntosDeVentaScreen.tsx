import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ApiError, api, endpoints, normalizeError, unwrapList } from '@/api';
import type { ApiResponse, CambiarEstadoLocalRequest, PuntoDeVentaResponse } from '@/api/types';
import { Button, Card, Chip, ConfirmDialog, EmptyState, Icon, Screen, Skeleton, StateBanner, Text, Toggle } from '@/components';
import { useApi, useToast } from '@/hooks';
import { IconButton } from '../components';
import { normalizeTime } from '../util';

export function PuntosDeVentaScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();

  const fetchLocales = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<PuntoDeVentaResponse[]>>(endpoints.comercio.pdv(), { signal }).then(unwrapList),
    [],
  );
  const { data, loading, error, run } = useApi(fetchLocales);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [borrar, setBorrar] = useState<PuntoDeVentaResponse | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [bloqueoBorrado, setBloqueoBorrado] = useState<string | null>(null);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  async function alternarAbierto(local: PuntoDeVentaResponse) {
    setTogglingId(local.id);
    try {
      const body: CambiarEstadoLocalRequest = { abierto: !local.abierto };
      await api.patch(endpoints.comercio.pdvEstado(local.id), body);
      await run();
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
    setBloqueoBorrado(null);
    try {
      await api.delete(endpoints.comercio.pdvById(borrar.id));
      toast.success('Local eliminado');
      await run();
      setBorrar(null);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      // 409: el local tiene pedidos o productos asociados y no se puede borrar
      if (apiError.kind === 'conflict') {
        setBloqueoBorrado(apiError.message);
      } else {
        toast.error(apiError.message);
      }
      setBorrar(null);
    } finally {
      setBorrando(false);
    }
  }

  const locales = data ?? [];

  return (
    <Screen scroll>
      <View style={s.header}>
        <Text variant="h2">Locales</Text>
        <Button title="Nuevo" size="sm" leftIcon="plus" onPress={() => navigation.navigate('PdvEditor', {})} />
      </View>

      {bloqueoBorrado ? (
        <View style={s.banner}>
          <StateBanner tone="error" title="No se puede borrar" message={bloqueoBorrado} />
        </View>
      ) : null}

      {error && !data ? (
        <StateBanner
          tone="warning"
          title="No pudimos cargar tus locales"
          message={error.message}
          action={{ label: 'Reintentar', onPress: () => run().catch(() => {}) }}
        />
      ) : loading && !data ? (
        <SkeletonLocales />
      ) : locales.length === 0 ? (
        <EmptyState
          icon="store"
          title="Aún no tienes locales"
          message="Crea tu primer punto de venta para empezar a recibir pedidos."
          action={{ label: 'Crear local', onPress: () => navigation.navigate('PdvEditor', {}) }}
        />
      ) : (
        <View style={s.list}>
          {locales.map((local) => (
            <Card key={local.id} padding={16}>
              <View style={s.cardTop}>
                <View style={s.cardInfo}>
                  <Text variant="label" numberOfLines={1}>
                    {local.nombre}
                  </Text>
                  <View style={s.metaRow}>
                    <Icon name="mapPin" size={12} color={t.colors.textMuted} />
                    <Text variant="small" color="textSecondary" numberOfLines={1}>
                      {local.ubicacion}
                    </Text>
                  </View>
                  <View style={s.metaRow}>
                    <Icon name="clock" size={12} color={t.colors.textMuted} />
                    <Text variant="small" color="textMuted">
                      {normalizeTime(local.horarioApertura)} – {normalizeTime(local.horarioCierre)}
                    </Text>
                    {local.tasaCumplimiento != null ? (
                      <Text variant="small" color="textMuted">
                        · {Math.round(local.tasaCumplimiento * 100)}% cumplimiento
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Chip label={local.abierto ? 'Abierto' : 'Cerrado'} tone={local.abierto ? 'success' : 'neutral'} size="sm" />
              </View>

              <View style={s.cardActions}>
                <Toggle
                  value={local.abierto}
                  onValueChange={() => alternarAbierto(local)}
                  label={local.abierto ? 'Abierto' : 'Cerrado'}
                  disabled={togglingId === local.id}
                />
                <View style={s.iconButtons}>
                  <IconButton
                    icon="edit"
                    label="Editar local"
                    onPress={() => navigation.navigate('PdvEditor', { puntoDeVentaId: local.id })}
                  />
                  <IconButton icon="trash" tone="danger" label="Borrar local" onPress={() => setBorrar(local)} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={!!borrar}
        title={borrar ? `¿Borrar ${borrar.nombre}?` : '¿Borrar local?'}
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar local"
        destructive
        loading={borrando}
        onConfirm={confirmarBorrado}
        onCancel={() => setBorrar(null)}
      />
    </Screen>
  );
}

function SkeletonLocales() {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing[3] }}>
      {[0, 1].map((i) => (
        <Card key={i} padding={16}>
          <Skeleton width="55%" height={16} />
          <View style={{ height: t.spacing[2] }} />
          <Skeleton width="70%" height={12} />
          <View style={{ height: t.spacing[3] }} />
          <Skeleton width="40%" height={28} radius={999} />
        </Card>
      ))}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing[3] },
    banner: { marginBottom: t.spacing[3] },
    list: { gap: t.spacing[3] },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: t.spacing[2] },
    cardInfo: { flex: 1, gap: 3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1], flexWrap: 'wrap' },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing[2],
      marginTop: t.spacing[3],
      paddingTop: t.spacing[3],
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
    },
    iconButtons: { flexDirection: 'row', gap: t.spacing[2] },
  });
}
