import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ApiError, api, endpoints, normalizeError, unwrapList } from '@/api';
import type { ApiResponse, ReclamoResponse, ResponderReclamoRequest } from '@/api/types';
import { ESTADO_RECLAMO_LABELS, TIPO_RECLAMO_LABELS, formatDateTime } from '@/lib';
import { Button, Card, EmptyState, Screen, Skeleton, StateBanner, StatusBadge, Text, TextArea } from '@/components';
import { useApi, useToast } from '@/hooks';
import { ComercioHeader } from '../components';

export function ReclamosComercioScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();

  const fetchReclamos = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<ReclamoResponse[]>>(endpoints.comercio.reclamos(), { signal }).then(unwrapList),
    [],
  );
  const { data, loading, error, run } = useApi(fetchReclamos);

  const [respondiendoId, setRespondiendoId] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  function abrirRespuesta(id: number) {
    setRespondiendoId(id);
    setTexto('');
  }

  async function enviar(reclamo: ReclamoResponse) {
    const respuesta = texto.trim();
    if (respuesta.length === 0) return;
    setEnviando(true);
    try {
      const body: ResponderReclamoRequest = { respuesta };
      await api.post(endpoints.comercio.responderReclamo(reclamo.id), body);
      toast.success('Respuesta enviada');
      setRespondiendoId(null);
      setTexto('');
      await run();
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      // 422: alguien ya respondió este reclamo; refrescamos para mostrar la respuesta
      if (apiError.kind === 'business') {
        toast.warning(apiError.message);
        run().catch(() => {});
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  const reclamos = data ?? [];

  return (
    <Screen scroll header={<ComercioHeader title="Reclamos recibidos" subtitle="Contra tus locales" onBack={() => navigation.goBack()} />}>
      {loading && !data ? (
        <SkeletonReclamos />
      ) : error && !data ? (
        <StateBanner
          tone="warning"
          title="No pudimos cargar los reclamos"
          message={error.message}
          action={{ label: 'Reintentar', onPress: () => run().catch(() => {}) }}
        />
      ) : reclamos.length === 0 ? (
        <EmptyState
          icon="messageCircle"
          title="No tienes reclamos"
          message="Cuando un cliente deje un reclamo contra tu local aparecerá aquí con su plazo de respuesta."
        />
      ) : (
        <View style={s.list}>
          {reclamos.map((reclamo) => {
            const respondido = reclamo.estado === 'RESPONDIDO';
            const abierto = respondiendoId === reclamo.id;
            return (
              <Card key={reclamo.id} padding={16}>
                <View style={s.cardTop}>
                  <View style={s.cardInfo}>
                    <Text variant="label">{TIPO_RECLAMO_LABELS[reclamo.tipo]}</Text>
                    <Text variant="small" color="textMuted">
                      {reclamo.codigoConstancia}
                      {reclamo.pedidoId != null ? ` · Pedido #${reclamo.pedidoId}` : ''}
                    </Text>
                  </View>
                  <StatusBadge tone={respondido ? 'success' : 'warning'} label={ESTADO_RECLAMO_LABELS[reclamo.estado]} size="sm" />
                </View>

                <Text variant="small" color="textSecondary" style={s.detalle}>
                  {reclamo.detalle}
                </Text>

                {respondido ? (
                  <View style={s.respuesta}>
                    <Text variant="sectionLabel" style={s.respuestaLabel}>
                      Tu respuesta
                    </Text>
                    <Text variant="body">{reclamo.respuesta}</Text>
                    {reclamo.respondidoAt ? (
                      <Text variant="small" color="textMuted" style={s.respuestaFecha}>
                        {formatDateTime(reclamo.respondidoAt)}
                      </Text>
                    ) : null}
                  </View>
                ) : abierto ? (
                  <View style={s.responder}>
                    <TextArea
                      label="Tu respuesta"
                      value={texto}
                      onChangeText={setTexto}
                      numberOfLines={4}
                      maxLength={2000}
                      placeholder="Responde al cliente de forma clara y empática…"
                    />
                    <View style={s.responderActions}>
                      <View style={s.responderItem}>
                        <Button title="Cancelar" variant="outline" onPress={() => setRespondiendoId(null)} disabled={enviando} fullWidth />
                      </View>
                      <View style={s.responderItem}>
                        <Button title="Enviar" leftIcon="send" onPress={() => enviar(reclamo)} loading={enviando} fullWidth />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={s.pendienteRow}>
                    {reclamo.plazoRespuestaAt ? (
                      <Text variant="small" color="warningFg">
                        Responde antes de {formatDateTime(reclamo.plazoRespuestaAt)}
                      </Text>
                    ) : (
                      <View />
                    )}
                    <Button title="Responder" size="sm" leftIcon="send" onPress={() => abrirRespuesta(reclamo.id)} />
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function SkeletonReclamos() {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing[3] }}>
      {[0, 1].map((i) => (
        <Card key={i} padding={16}>
          <Skeleton width="45%" height={14} />
          <View style={{ height: t.spacing[3] }} />
          <Skeleton width="100%" height={12} />
          <View style={{ height: t.spacing[2] }} />
          <Skeleton width="80%" height={12} />
        </Card>
      ))}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    list: { gap: t.spacing[3] },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: t.spacing[2] },
    cardInfo: { flex: 1, gap: 2 },
    detalle: { marginTop: t.spacing[2], lineHeight: 19 },
    respuesta: {
      marginTop: t.spacing[3],
      padding: t.spacing[3],
      borderRadius: t.radii.input,
      backgroundColor: t.colors.bgSurface2,
      borderLeftWidth: 3,
      borderLeftColor: t.colors.accent,
      gap: 4,
    },
    respuestaLabel: { marginBottom: 2 },
    respuestaFecha: { marginTop: t.spacing[1] },
    responder: { marginTop: t.spacing[3], gap: t.spacing[3] },
    responderActions: { flexDirection: 'row', gap: t.spacing[2] },
    responderItem: { flex: 1 },
    pendienteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing[2],
      marginTop: t.spacing[3],
      paddingTop: t.spacing[3],
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
    },
  });
}
