import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import {
  Avatar,
  Button,
  Card,
  LoadMore,
  MetricCard,
  Screen,
  Skeleton,
  StateBanner,
  Stars,
  Text,
  Toggle,
} from '@/components';
import { useApi, useInfiniteList, useToast } from '@/hooks';
import { useAuth } from '@/auth';
import { api, endpoints, unwrap, unwrapPage } from '@/api';
import type {
  ApiError,
  ApiResponse,
  PageResponse,
  PerfilesResponse,
  PerfilRepartidorResponse,
  ResenaResponse,
} from '@/api';
import { formatDateTime } from '@/lib';

// Perfil del repartidor: disponibilidad, calificación y total de entregas, más las
// reseñas que le dejaron. La disponibilidad se guarda al instante en el backend.
export function PerfilScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const nav = useNavigation<any>();
  const toast = useToast();
  const { user, logout } = useAuth();
  const usuarioId = user?.usuarioId ?? null;

  const [disponible, setDisponible] = useState(false);

  const perfil = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<PerfilesResponse>>(endpoints.perfiles.get(), { signal });
      return unwrap(res);
    }, []),
  );

  const guardar = useApi(
    useCallback(async (signal: AbortSignal, valor: boolean) => {
      const res = await api.put<ApiResponse<PerfilRepartidorResponse>>(
        endpoints.perfiles.repartidor(),
        { disponible: valor },
        { signal },
      );
      return unwrap(res);
    }, []),
  );

  const fetchResenas = useCallback(
    async (page: number, size: number, signal: AbortSignal): Promise<PageResponse<ResenaResponse>> => {
      if (usuarioId === null) {
        return { content: [], page: 0, size, totalElements: 0, totalPages: 0 };
      }
      const res = await api.get<ApiResponse<PageResponse<ResenaResponse>>>(
        endpoints.catalogo.resenasRepartidor(usuarioId),
        { params: { page, size }, signal },
      );
      return unwrapPage(res);
    },
    [usuarioId],
  );

  const resenas = useInfiniteList<ResenaResponse>(fetchResenas);

  const repartidor = perfil.data?.repartidor ?? null;

  useEffect(() => {
    perfil.run().catch(() => {});
  }, [perfil.run]);

  useEffect(() => {
    if (repartidor) setDisponible(repartidor.disponible);
  }, [repartidor]);

  async function onToggle(valor: boolean) {
    setDisponible(valor);
    try {
      await guardar.run(valor);
    } catch (err) {
      // si el guardado falla, devolvemos el switch a su estado real y avisamos
      setDisponible(!valor);
      toast.error((err as ApiError).message);
    }
  }

  function refrescar() {
    perfil.run().catch(() => {});
    resenas.refresh();
  }

  const calificacion =
    repartidor && repartidor.calificacionPromedio !== null ? repartidor.calificacionPromedio.toFixed(1) : '—';

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={resenas.refreshing} onRefresh={refrescar} tintColor={t.colors.brand} colors={[t.colors.brand]} />
      }
    >
      <View style={s.identidad}>
        <Avatar name={user?.nombreCompleto} size={64} />
        <View style={s.identidadTextos}>
          <Text variant="h3">{user?.nombreCompleto ?? 'Repartidor'}</Text>
          <Text variant="small" color="textMuted">
            Repartidor · UTEC
          </Text>
        </View>
      </View>

      {perfil.loading && repartidor === null ? (
        <View style={s.skeletonWrap}>
          <Skeleton width="100%" height={72} radius={t.radii.card} />
          <Skeleton width="100%" height={88} radius={t.radii.card} style={{ marginTop: t.spacing[4] }} />
        </View>
      ) : (
        <>
          <Card
            padding={16}
            style={{
              backgroundColor: disponible ? t.colors.successBg : t.colors.bgSurface,
              borderColor: disponible ? t.colors.successDot : t.colors.borderDefault,
            }}
          >
            <Toggle
              value={disponible}
              onValueChange={onToggle}
              label={disponible ? 'Disponible para entregas' : 'No disponible'}
              sub={disponible ? 'Recibirás solicitudes cercanas' : 'Actívate para recibir solicitudes'}
            />
          </Card>

          <View style={s.metricas}>
            <MetricCard icon="star" value={calificacion} label="Calificación" tone="warning" />
            <MetricCard icon="bike" value={String(repartidor?.totalEntregas ?? 0)} label="Entregas" tone="brand" />
          </View>

          <StateBanner
            tone="info"
            message="Tu calificación y total de entregas se actualizan solos con cada entrega completada."
          />
        </>
      )}

      <Text variant="sectionLabel" style={s.resenasLabel}>
        Reseñas
      </Text>

      {resenas.loading && resenas.items.length === 0 ? (
        <View style={s.skeletonWrap}>
          <Skeleton width="100%" height={84} radius={t.radii.card} />
          <Skeleton width="100%" height={84} radius={t.radii.card} style={{ marginTop: t.spacing[3] }} />
        </View>
      ) : resenas.items.length === 0 ? (
        <Card padding={16}>
          <Text variant="small" color="textSecondary" align="center">
            Todavía no tienes reseñas. Aparecerán aquí cuando los clientes califiquen tus entregas.
          </Text>
        </Card>
      ) : (
        <View style={s.resenasLista}>
          {resenas.items.map((resena) => (
            <Card key={resena.id} padding={14}>
              <View style={s.resenaHeader}>
                <View style={s.resenaAutor}>
                  <Avatar name={resena.autorNombre} size={36} />
                  <View style={s.resenaAutorTextos}>
                    <Text variant="small" color="textPrimary" style={s.resenaNombre}>
                      {resena.autorNombre}
                    </Text>
                    <Text variant="badge" color="textMuted">
                      {formatDateTime(resena.createdAt)}
                    </Text>
                  </View>
                </View>
                <Stars value={resena.calificacion} size={14} />
              </View>
              {resena.comentario ? (
                <Text variant="small" color="textSecondary" style={s.resenaComentario}>
                  {resena.comentario}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {resenas.items.length > 0 ? (
        <LoadMore loading={resenas.loadingMore} hasMore={resenas.hasMore} onLoadMore={resenas.loadMore} endLabel="No hay más reseñas" />
      ) : null}

      <View style={s.acciones}>
        <Button title="Mi cuenta" variant="outline" leftIcon="settings" onPress={() => nav.navigate('Settings')} fullWidth />
        <Button title="Cerrar sesión" variant="secondary" leftIcon="logOut" onPress={logout} fullWidth />
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    identidad: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], marginBottom: t.spacing[4] },
    identidadTextos: { flex: 1, minWidth: 0 },
    skeletonWrap: {},
    metricas: { flexDirection: 'row', gap: t.spacing[3], marginTop: t.spacing[4] },
    resenasLabel: { marginTop: t.spacing[6], marginBottom: t.spacing[3] },
    resenasLista: { gap: t.spacing[3] },
    resenaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[2] },
    resenaAutor: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2], flex: 1, minWidth: 0 },
    resenaAutorTextos: { flex: 1, minWidth: 0 },
    resenaNombre: { fontFamily: t.fontFamily.semibold },
    resenaComentario: { marginTop: t.spacing[2] },
    acciones: { marginTop: t.spacing[6], gap: t.spacing[3] },
  });
}
