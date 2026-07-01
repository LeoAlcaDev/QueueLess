import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrap } from '@/api';
import type { ApiResponse, CrearPedidoRequest, PedidoResponse, TipoEntrega } from '@/api';
import { useApi } from '@/hooks';
import { ZONAS_ENTREGA } from '@/lib';
import {
  Button,
  Card,
  EmptyState,
  FoodThumb,
  Icon,
  PickupDeliveryToggle,
  Screen,
  Select,
  StateBanner,
  Stepper,
  SummaryRow,
  Text,
  Toggle,
} from '@/components';
import { TopBar } from '../components';
import { useCart } from '../cart/CartContext';

const FALTA_ZONA = 'Un pedido delivery necesita la zona de entrega';
const FECHAS = [
  { label: 'Hoy', value: '0' },
  { label: 'Mañana', value: '1' },
];
const HORAS = ['12:30', '13:00', '13:30', '14:00'].map((h) => ({ label: h, value: h }));

function buildProgramadoIso(diasOffset: string, hhmm: string): string {
  const [hora, minuto] = hhmm.split(':').map(Number);
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + Number(diasOffset));
  fecha.setHours(hora, minuto, 0, 0);
  return fecha.toISOString();
}

export function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const cart = useCart();

  const [mode, setMode] = useState<TipoEntrega>('PICKUP');
  const [zona, setZona] = useState<string | null>(null);
  const [programado, setProgramado] = useState(false);
  const [dia, setDia] = useState('0');
  const [hora, setHora] = useState('13:00');
  const [zonaError, setZonaError] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const crear = useApi((signal, body: CrearPedidoRequest) =>
    api.post<ApiResponse<PedidoResponse>>(endpoints.cliente.crearPedido(), body, { signal }).then(unwrap),
  );

  if (cart.count === 0) {
    return (
      <Screen padded={false} header={<TopBar title="Tu carrito" onBack={() => navigation.goBack()} />}>
        <View style={s.emptyWrap}>
          <EmptyState
            icon="shoppingBag"
            title="Tu carrito está vacío"
            message="Explora los puntos de venta del campus y arma tu pedido."
            action={{ label: 'Ver locales', onPress: () => navigation.navigate('Inicio', { screen: 'Home' }) }}
          />
        </View>
      </Screen>
    );
  }

  async function pagar() {
    setErrorMsg(null);
    if (mode === 'DELIVERY' && !zona) {
      setZonaError(FALTA_ZONA);
      return;
    }
    setZonaError(undefined);
    const body: CrearPedidoRequest = {
      puntoDeVentaId: cart.puntoDeVentaId as number,
      tipoEntrega: mode,
      zonaEntrega: mode === 'DELIVERY' ? (zona as string) : undefined,
      recojoProgramadoAt: programado ? buildProgramadoIso(dia, hora) : undefined,
      items: cart.items.map((it) => ({ productoId: it.productoId, cantidad: it.cantidad })),
    };
    try {
      const pedido = await crear.run(body);
      cart.clear();
      navigation.navigate('Pago', { pedido });
    } catch (err) {
      // crear.run ya guardó el error normalizado; mostramos el mensaje del backend
      setErrorMsg(crear.error?.message ?? 'No pudimos crear el pedido.');
    }
  }

  const cta = (
    <Button title={`Pagar S/ ${cart.subtotal.toFixed(2)}`} onPress={pagar} loading={crear.loading} fullWidth />
  );

  return (
    <Screen
      scroll
      padded={false}
      header={<TopBar title="Tu carrito" onBack={() => navigation.goBack()} />}
      footer={cta}
    >
      <View style={s.content}>
        <Text variant="small" color="textSecondary">
          de <Text variant="label" color="textPrimary">{cart.puntoDeVentaNombre ?? ''}</Text>
        </Text>

        <View style={s.items}>
          {cart.items.map((it) => (
            <View key={it.productoId} style={s.item}>
              <FoodThumb uri={it.fotoUrl} size={48} />
              <View style={s.itemInfo}>
                <Text variant="label" color="textPrimary" numberOfLines={1}>
                  {it.nombre}
                </Text>
                <Text variant="small" color="textSecondary" style={s.tab}>
                  {`S/ ${(it.precio * it.cantidad).toFixed(2)}`}
                </Text>
              </View>
              <Stepper value={it.cantidad} min={1} onChange={(qty) => cart.setQty(it.productoId, qty)} />
              <Pressable onPress={() => cart.remove(it.productoId)} hitSlop={8} style={s.remove}>
                <Icon name="x" size={16} color={t.colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>

        {errorMsg ? <StateBanner tone="error" title="No pudimos crear el pedido" message={errorMsg} /> : null}

        <View style={s.block}>
          <Text variant="sectionLabel" style={s.blockLabel}>
            ¿Cómo lo recibes?
          </Text>
          <PickupDeliveryToggle value={mode} onChange={setMode} />
        </View>

        {mode === 'DELIVERY' ? (
          <Select
            label="Zona de entrega"
            value={zona}
            onChange={(v) => {
              setZona(v);
              setZonaError(undefined);
            }}
            placeholder="Elige una zona del campus"
            options={ZONAS_ENTREGA.map((z) => ({ label: z, value: z }))}
            error={zonaError}
          />
        ) : null}

        <Card padding={14}>
          <Toggle
            value={programado}
            onValueChange={setProgramado}
            label="Pedido programado"
            sub="Elige fecha y hora de recojo"
          />
          {programado ? (
            <View style={s.programado}>
              <View style={s.programadoCol}>
                <Select label="Fecha" value={dia} onChange={setDia} options={FECHAS} />
              </View>
              <View style={s.programadoCol}>
                <Select label="Hora" value={hora} onChange={setHora} options={HORAS} />
              </View>
            </View>
          ) : null}
        </Card>

        <Card padding={14}>
          <View style={s.summary}>
            <SummaryRow label="Subtotal" value={`S/ ${cart.subtotal.toFixed(2)}`} />
            <SummaryRow
              label={mode === 'DELIVERY' ? 'Entrega comunitaria' : 'Recojo en tienda'}
              value="Gratis"
            />
            <View style={s.divider} />
            <SummaryRow label="Total" value={`S/ ${cart.subtotal.toFixed(2)}`} strong />
          </View>
        </Card>

        <StateBanner
          tone="info"
          message="Una vez que el comercio acepte tu pedido, no podrás cancelar ni recibir reembolso automático."
        />
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4], gap: t.spacing[4] },
    emptyWrap: { flex: 1, justifyContent: 'center' },
    items: { gap: t.spacing[2] },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[3],
      padding: t.spacing[3],
      backgroundColor: t.colors.bgSurface,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      borderRadius: t.radii.card,
    },
    itemInfo: { flex: 1, minWidth: 0 },
    tab: { fontVariant: ['tabular-nums'] },
    remove: { padding: t.spacing[1] },
    block: { gap: t.spacing[2] },
    blockLabel: { marginBottom: t.spacing[1] },
    programado: { flexDirection: 'row', gap: t.spacing[2], marginTop: t.spacing[3] },
    programadoCol: { flex: 1 },
    summary: { gap: t.spacing[2] },
    divider: { height: 1, backgroundColor: t.colors.borderDefault, marginVertical: 2 },
  });
}
