import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrap } from '@/api';
import type {
  ApiResponse,
  AsistenteRequest,
  AsistenteResponse,
  RecomendacionItem,
  TurnoConversacion,
} from '@/api';
import { useApi } from '@/hooks';
import {
  Card,
  Chip,
  EmptyState,
  Field,
  Icon,
  Price,
  Screen,
  StateBanner,
  Text,
  WaitBadge,
} from '@/components';

const SUGERENCIAS = [
  'Algo sin gluten y barato',
  'Quiero algo vegano',
  'Lo más rápido ahora',
  'Bajo mi presupuesto de S/ 18',
];
const INTRO =
  'Hola. Dime qué se te antoja y te recomiendo platos seguros para tu perfil, dentro de tu presupuesto y pedibles ahora.';

type Msg =
  | { kind: 'user'; texto: string }
  | { kind: 'bot'; texto: string }
  | { kind: 'recs'; items: RecomendacionItem[] }
  | { kind: 'aviso'; texto: string }
  | { kind: 'empty' };

function Bubble({ who, children }: { who: 'user' | 'bot'; children: React.ReactNode }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const me = who === 'user';
  return (
    <View style={[s.bubbleRow, me && s.bubbleRowMe]}>
      {!me ? (
        <View style={s.botAvatar}>
          <Icon name="sparkles" size={16} color={t.colors.onBrand} />
        </View>
      ) : null}
      <View style={[s.bubble, me ? s.bubbleMe : s.bubbleBot]}>
        {typeof children === 'string' ? (
          <Text variant="body" style={{ color: me ? t.colors.onBrand : t.colors.textPrimary }}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

function TypingDots() {
  const t = useTheme();
  const dots = [useRef(new Animated.Value(0.4)).current, useRef(new Animated.Value(0.4)).current, useRef(new Animated.Value(0.4)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots]);
  return (
    <View style={typingStyles.row}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[typingStyles.dot, { backgroundColor: t.colors.textMuted, opacity: d }]} />
      ))}
    </View>
  );
}

export function AsistenteScreen() {
  const navigation = useNavigation<any>();
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');

  const asistente = useApi((signal, body: AsistenteRequest) =>
    api.post<ApiResponse<AsistenteResponse>>(endpoints.cliente.asistente(), body, { signal }).then(unwrap),
  );

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [messages, asistente.loading]);

  async function enviar(mensaje: string) {
    const limpio = mensaje.trim();
    if (!limpio || asistente.loading) return;
    setText('');
    const previos = messages;
    setMessages((prev) => [...prev, { kind: 'user', texto: limpio }]);

    const historial: TurnoConversacion[] = previos
      .filter((m): m is Extract<Msg, { kind: 'user' | 'bot' }> => m.kind === 'user' || m.kind === 'bot')
      .map((m) => ({ rol: m.kind === 'user' ? 'USUARIO' : 'ASISTENTE', texto: m.texto }));

    try {
      const res = await asistente.run({ mensaje: limpio, historial });
      const next: Msg[] = [];
      if (!res.asistenteDisponible && res.aviso) next.push({ kind: 'aviso', texto: res.aviso });
      if (res.explicacion) next.push({ kind: 'bot', texto: res.explicacion });
      if (res.recomendaciones.length > 0) next.push({ kind: 'recs', items: res.recomendaciones });
      else next.push({ kind: 'empty' });
      setMessages((prev) => [...prev, ...next]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { kind: 'bot', texto: asistente.error?.message ?? 'No pude responder ahora. Intenta de nuevo.' },
      ]);
    }
  }

  return (
    <Screen scroll={false} padded={false}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={s.convo} keyboardShouldPersistTaps="handled">
          <Bubble who="bot">{INTRO}</Bubble>

          {messages.map((m, i) => {
            if (m.kind === 'user') return <Bubble key={i} who="user">{m.texto}</Bubble>;
            if (m.kind === 'bot') return <Bubble key={i} who="bot">{m.texto}</Bubble>;
            if (m.kind === 'aviso') {
              return (
                <View key={i} style={s.indent}>
                  <StateBanner
                    tone="warning"
                    icon="bot"
                    title="Asistente con disponibilidad reducida"
                    message={m.texto}
                  />
                </View>
              );
            }
            if (m.kind === 'empty') {
              return (
                <View key={i} style={s.indent}>
                  <EmptyState
                    icon="utensils"
                    title="Sin opciones por ahora"
                    message="Prueba ampliar tu presupuesto o quitar alguna restricción en tu perfil."
                  />
                </View>
              );
            }
            return (
              <View key={i} style={[s.indent, s.recs]}>
                {m.items.map((rec) => (
                  <RecCard
                    key={`${rec.puntoDeVentaId}-${rec.productoId}`}
                    rec={rec}
                    onPedir={() =>
                      navigation.navigate('PuntoDetalle', {
                        puntoId: rec.puntoDeVentaId,
                        nombre: rec.puntoDeVentaNombre,
                      })
                    }
                  />
                ))}
              </View>
            );
          })}

          {asistente.loading ? (
            <Bubble who="bot">
              <TypingDots />
            </Bubble>
          ) : null}
        </ScrollView>

        <View style={s.inputArea}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {SUGERENCIAS.map((sug) => (
              <Chip key={sug} label={sug} tone="neutral" onPress={() => enviar(sug)} />
            ))}
          </ScrollView>
          <View style={s.inputRow}>
            <View style={s.flex}>
              <Field value={text} onChangeText={setText} placeholder="Escribe qué se te antoja…" />
            </View>
            <Pressable onPress={() => enviar(text)} style={s.send} hitSlop={6}>
              <Icon name="send" size={20} color={t.colors.onBrand} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function RecCard({ rec, onPedir }: { rec: RecomendacionItem; onPedir: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Card padding={12}>
      <View style={s.recHead}>
        <View style={s.recInfo}>
          <View style={s.recTitle}>
            <Text variant="label" color="textPrimary" style={s.recName} numberOfLines={1}>
              {rec.nombre}
            </Text>
            <Price amount={rec.precio} size="sm" />
          </View>
          <View style={s.recVendor}>
            <Icon name="store" size={12} color={t.colors.textMuted} />
            <Text variant="small" color="textMuted" numberOfLines={1}>
              {rec.puntoDeVentaNombre}
            </Text>
          </View>
          <Text variant="small" color="textSecondary" numberOfLines={2}>
            {rec.descripcion}
          </Text>
        </View>
      </View>
      <View style={s.recFooter}>
        <View style={s.recTags}>
          <WaitBadge minutes={rec.minutosEstimados} />
          {rec.dentroDePresupuesto ? <Chip label="Dentro de tu presupuesto" tone="success" icon="check" size="sm" /> : null}
        </View>
        <Pressable onPress={onPedir} style={s.pedir} hitSlop={6}>
          <Icon name="plus" size={14} color={t.colors.onBrand} strokeWidth={2.6} />
          <Text variant="label" style={{ color: t.colors.onBrand }}>
            Pedir
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 999 },
});

function makeStyles(t: Theme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    convo: { padding: t.spacing[4], gap: t.spacing[3] },
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] },
    bubbleRowMe: { flexDirection: 'row-reverse' },
    botAvatar: {
      width: 30,
      height: 30,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.points,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubble: { maxWidth: '82%', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 16 },
    bubbleMe: { backgroundColor: t.colors.brandStrong, borderBottomRightRadius: 4 },
    bubbleBot: { backgroundColor: t.colors.bgSurface2, borderBottomLeftRadius: 4 },
    indent: { paddingLeft: 38 },
    recs: { gap: t.spacing[2] },
    inputArea: {
      gap: t.spacing[2],
      paddingHorizontal: t.spacing[4],
      paddingTop: t.spacing[2],
      paddingBottom: t.spacing[2],
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgPage,
    },
    chips: { gap: t.spacing[2], paddingVertical: 2 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] },
    send: {
      width: 48,
      height: 48,
      borderRadius: t.radii.button,
      backgroundColor: t.colors.brandStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recHead: { flexDirection: 'row', gap: t.spacing[3] },
    recInfo: { flex: 1, minWidth: 0, gap: 2 },
    recTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[2] },
    recName: { flex: 1 },
    recVendor: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] },
    recFooter: {
      marginTop: t.spacing[3],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing[2],
      flexWrap: 'wrap',
    },
    recTags: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1], flexWrap: 'wrap', flex: 1 },
    pedir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[1],
      paddingVertical: t.spacing[2],
      paddingHorizontal: t.spacing[3],
      borderRadius: t.radii.button,
      backgroundColor: t.colors.brandStrong,
    },
  });
}
