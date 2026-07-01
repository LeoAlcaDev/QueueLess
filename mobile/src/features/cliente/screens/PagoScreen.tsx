import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrap } from '@/api';
import type { ApiResponse, IniciarPagoResponse, PagoResponse, PedidoResponse } from '@/api';
import { useApi } from '@/hooks';
import { Button, Card, Screen, StateBanner, SummaryRow, Text } from '@/components';
import { CountdownRing, TopBar } from '../components';

type Fase = 'resumen' | 'confirmando' | 'conflict' | 'fallido';

export function PagoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const pedido: PedidoResponse = route.params?.pedido;
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const [fase, setFase] = useState<Fase>('resumen');
  const [pagoId, setPagoId] = useState<number | null>(null);
  // candado de un solo intento: evita doble cobro si el botón se toca dos veces
  const enVuelo = useRef(false);

  const iniciar = useApi((signal) =>
    api
      .post<ApiResponse<IniciarPagoResponse>>(endpoints.cliente.iniciarPago(), { pedidoId: pedido.id }, { signal })
      .then(unwrap),
  );
  const simular = useApi((signal) =>
    api.post<ApiResponse<unknown>>(endpoints.dev.simularPago(pedido.id), {}, { signal }).then(unwrap),
  );

  async function pagar() {
    if (enVuelo.current) return;
    enVuelo.current = true;
    try {
      const res = await iniciar.run();
      setPagoId(res.pagoId);
      setFase('confirmando');
      Linking.openURL(res.urlCheckout).catch(() => {});
    } catch {
      if (iniciar.error?.kind === 'conflict') {
        // ya hay un pago iniciado para este pedido: no reintentamos, lo mandamos al existente
        setFase('conflict');
      } else {
        enVuelo.current = false;
      }
    }
  }

  // mientras confirmamos, consultamos el estado del pago hasta que se acredite o falle
  useEffect(() => {
    if (fase !== 'confirmando' || pagoId == null) return;
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const pago = await api
          .get<ApiResponse<PagoResponse>>(endpoints.cliente.pago(pagoId))
          .then(unwrap);
        if (cancelled) return;
        if (pago.estado === 'CONFIRMADO') {
          clearInterval(id);
          navigation.navigate('Seguimiento', { pedidoId: pedido.id });
        } else if (pago.estado === 'FALLIDO' || pago.estado === 'REEMBOLSADO') {
          clearInterval(id);
          enVuelo.current = false;
          setFase('fallido');
        }
      } catch {
        // un fallo de red puntual no corta el sondeo; reintenta en el próximo tick
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fase, pagoId, pedido.id, navigation]);

  let inner;
  if (fase === 'confirmando') {
    inner = (
      <View style={s.confirming}>
        <CountdownRing
          color="info"
          totalSecs={30}
          size={176}
          label="Confirmando tu pago… No cierres esta pantalla, se actualiza en vivo."
        />
        <StateBanner
          tone="info"
          icon="creditCard"
          message="Esperando la confirmación de la pasarela. Te avisaremos apenas se acredite."
        />
        {__DEV__ ? (
          <Button
            title="Simular pago (dev)"
            variant="secondary"
            onPress={() => simular.run().catch(() => {})}
            loading={simular.loading}
            fullWidth
          />
        ) : null}
      </View>
    );
  } else if (fase === 'conflict') {
    inner = (
      <View style={s.block}>
        <StateBanner
          tone="warning"
          title="Este pedido ya tiene un pago iniciado"
          message="Continúa con el pago que ya empezaste."
        />
        <Button
          title="Ir al pago existente"
          onPress={() => navigation.navigate('Seguimiento', { pedidoId: pedido.id })}
          fullWidth
        />
      </View>
    );
  } else {
    inner = (
      <View style={s.block}>
        <Card padding={16}>
          <Text variant="sectionLabel" style={s.cardLabel}>
            {`Pedido ${pedido.codigo}`}
          </Text>
          <View style={s.summary}>
            {pedido.items.map((it) => (
              <SummaryRow
                key={it.id}
                label={`${it.cantidad}× ${it.nombre}`}
                value={`S/ ${it.subtotal.toFixed(2)}`}
              />
            ))}
            <View style={s.divider} />
            <SummaryRow label="Total a pagar" value={`S/ ${pedido.total.toFixed(2)}`} strong />
          </View>
        </Card>

        {fase === 'fallido' ? (
          <StateBanner
            tone="error"
            title="El pago no se completó"
            message="No se acreditó el pago. Vuelve a intentarlo."
          />
        ) : (
          <StateBanner
            tone="info"
            icon="lock"
            message="Pago seguro. Se confirma en segundos; el comercio recibe tu pedido al instante."
          />
        )}

        <Button
          title={fase === 'fallido' ? `Reintentar · S/ ${pedido.total.toFixed(2)}` : `Pagar S/ ${pedido.total.toFixed(2)}`}
          leftIcon="creditCard"
          onPress={pagar}
          loading={iniciar.loading}
          fullWidth
        />
      </View>
    );
  }

  return (
    <Screen scroll padded={false} header={<TopBar title="Pago" onBack={() => navigation.goBack()} />}>
      <View style={s.content}>{inner}</View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4] },
    block: { gap: t.spacing[4] },
    confirming: { alignItems: 'stretch', gap: t.spacing[4], paddingVertical: t.spacing[6] },
    cardLabel: { marginBottom: t.spacing[3] },
    summary: { gap: t.spacing[2] },
    divider: { height: 1, backgroundColor: t.colors.borderDefault, marginVertical: 2 },
  });
}
