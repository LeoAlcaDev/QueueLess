import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrap } from '@/api';
import type { ApiResponse, CrearResenaRequest, ObjetivoResena, PedidoResponse, ResenaResponse } from '@/api';
import { useApi, useToast } from '@/hooks';
import {
  Button,
  Card,
  EmptyState,
  FoodThumb,
  Screen,
  Segmented,
  Stars,
  StatusBadge,
  Text,
  TextArea,
} from '@/components';
import { TopBar } from '../components';

const ESTRELLA_LABELS = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'];

export function ResenaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const pedidoId: number = route.params?.pedidoId;
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const toast = useToast();

  const [target, setTarget] = useState<ObjetivoResena>('PUNTO_DE_VENTA');
  const [stars, setStars] = useState(5);
  const [comentario, setComentario] = useState('');
  const [done, setDone] = useState(false);

  const pedidoApi = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<PedidoResponse>>(endpoints.cliente.pedido(pedidoId), { signal });
      return unwrap(res);
    }, [pedidoId]),
  );
  useEffect(() => {
    pedidoApi.run().catch(() => {});
  }, [pedidoApi.run]);

  const crear = useApi((signal, body: CrearResenaRequest) =>
    api
      .post<ApiResponse<ResenaResponse>>(endpoints.cliente.crearResena(pedidoId), body, { signal })
      .then(unwrap),
  );

  async function enviar() {
    const body: CrearResenaRequest = {
      objetivoTipo: target,
      calificacion: stars,
      comentario: comentario.trim() ? comentario.trim() : undefined,
    };
    try {
      await crear.run(body);
      toast.success('Reseña enviada · ¡gracias!');
      navigation.goBack();
    } catch {
      // 409/422 = ya existe reseña para este pedido: pasamos al estado "ya reseñó"
      if (crear.error?.kind === 'conflict' || crear.error?.kind === 'business') {
        setDone(true);
      } else {
        toast.error(crear.error?.message ?? 'No pudimos enviar tu reseña.');
      }
    }
  }

  if (done) {
    return (
      <Screen padded={false} header={<TopBar title="Dejar reseña" onBack={() => navigation.goBack()} />}>
        <View style={s.doneWrap}>
          <EmptyState
            icon="checkCircle"
            title="Ya dejaste tu reseña"
            message="Solo puedes reseñar una vez por pedido. Gracias por tu opinión."
            action={{ label: 'Volver a mis pedidos', onPress: () => navigation.goBack() }}
          />
        </View>
      </Screen>
    );
  }

  const cta = <Button title="Enviar reseña" leftIcon="send" onPress={enviar} loading={crear.loading} fullWidth />;

  return (
    <Screen
      scroll
      padded={false}
      header={<TopBar title="Dejar reseña" onBack={() => navigation.goBack()} />}
      footer={cta}
    >
      <View style={s.content}>
        {pedidoApi.data ? (
          <Card padding={14}>
            <View style={s.head}>
              <FoodThumb uri={null} size={44} />
              <View style={s.headInfo}>
                <Text variant="label" color="textPrimary" style={s.code}>
                  {pedidoApi.data.codigo}
                </Text>
                <StatusBadge estado={pedidoApi.data.estado} size="sm" />
              </View>
            </View>
          </Card>
        ) : null}

        <View style={s.block}>
          <Text variant="sectionLabel">¿Qué quieres reseñar?</Text>
          <Segmented
            fullWidth
            value={target}
            onChange={(v) => setTarget(v as ObjetivoResena)}
            options={[
              { label: 'El local', value: 'PUNTO_DE_VENTA' },
              { label: 'El repartidor', value: 'REPARTIDOR' },
            ]}
          />
        </View>

        <View style={s.rating}>
          <Text variant="label" color="textSecondary">
            Tu calificación
          </Text>
          <Stars value={stars} size={40} editable onChange={setStars} />
          <Text variant="small" color="textMuted">
            {ESTRELLA_LABELS[stars]}
          </Text>
        </View>

        <TextArea
          label="Comentario (opcional)"
          value={comentario}
          onChangeText={setComentario}
          placeholder="Cuéntanos cómo estuvo tu pedido…"
          numberOfLines={4}
          maxLength={2000}
        />
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4], gap: t.spacing[6] },
    doneWrap: { flex: 1, justifyContent: 'center' },
    head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    headInfo: { gap: t.spacing[1] },
    code: { fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
    block: { gap: t.spacing[2] },
    rating: { alignItems: 'center', gap: t.spacing[2] },
  });
}
