import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import type { PedidoResponse } from '@/api/types';
import { Button, Card, Chip, Icon, Price, Text } from '@/components/ui';
import { minutosDesde, resumenItems } from '../util';

export interface QueueCardProps {
  pedido: PedidoResponse;
  busy?: boolean;
  onOpen: () => void;
  onAceptar: () => void;
  onRechazar: () => void;
  onIniciar: () => void;
  onListo: () => void;
  onEntregar: () => void;
}

// Card de un pedido en la cola del mostrador. La acción grande cambia según el
// estado y vive dentro de la card, para operar sin abrir el detalle.
export function QueueCard({ pedido, busy = false, onOpen, onAceptar, onRechazar, onIniciar, onListo, onEntregar }: QueueCardProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const espera = minutosDesde(pedido.creadoAt);
  const urgente = espera >= 14;
  const esDelivery = pedido.tipoEntrega === 'DELIVERY';

  return (
    <Card padding={13} style={urgente ? { borderColor: t.colors.warningDot } : undefined}>
      <View style={s.topRow}>
        <Pressable onPress={onOpen} style={s.codeBlock} accessibilityRole="button">
          <Text variant="label" style={s.code}>
            {pedido.codigo}
          </Text>
          <Text variant="small" color="textMuted">
            {pedido.items.length} {pedido.items.length === 1 ? 'producto' : 'productos'}
          </Text>
        </Pressable>
        <View style={s.espera}>
          <Icon name="clock" size={12} color={urgente ? t.colors.warningFg : t.colors.textMuted} />
          <Text variant="badge" color={urgente ? 'warningFg' : 'textMuted'}>
            {espera} min
          </Text>
        </View>
      </View>

      <Text variant="small" color="textSecondary" style={s.items}>
        {resumenItems(pedido.items)}
      </Text>

      <View style={s.metaRow}>
        <Chip
          label={esDelivery ? 'Delivery' : 'Recojo'}
          tone={esDelivery ? 'points' : 'neutral'}
          icon={esDelivery ? 'users' : 'shoppingBag'}
          size="sm"
        />
        <Price amount={pedido.total} size="sm" />
      </View>

      <Actions
        pedido={pedido}
        busy={busy}
        onAceptar={onAceptar}
        onRechazar={onRechazar}
        onIniciar={onIniciar}
        onListo={onListo}
        onEntregar={onEntregar}
      />
    </Card>
  );
}

function Actions({
  pedido,
  busy,
  onAceptar,
  onRechazar,
  onIniciar,
  onListo,
  onEntregar,
}: Omit<QueueCardProps, 'onOpen'> & { busy: boolean }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  if (pedido.estado === 'PAGADO_ESPERANDO_COMERCIO') {
    return (
      <View style={s.actionsRow}>
        <View style={s.actionItem}>
          <Button title="Rechazar" variant="outline" size="sm" onPress={onRechazar} disabled={busy} fullWidth />
        </View>
        <View style={s.actionItem}>
          <Button title="Aceptar" size="sm" onPress={onAceptar} loading={busy} fullWidth />
        </View>
      </View>
    );
  }
  if (pedido.estado === 'ACEPTADO') {
    return (
      <View style={s.actionsSingle}>
        <Button title="Iniciar preparación" size="sm" onPress={onIniciar} loading={busy} fullWidth />
      </View>
    );
  }
  if (pedido.estado === 'EN_PREPARACION') {
    return (
      <View style={s.actionsSingle}>
        <Button title="Marcar listo" size="sm" onPress={onListo} loading={busy} fullWidth />
      </View>
    );
  }
  if (pedido.estado === 'LISTO_PARA_RECOGER') {
    return (
      <View style={s.actionsSingle}>
        <Button title="Marcar entregado" size="sm" leftIcon="qrCode" onPress={onEntregar} disabled={busy} fullWidth />
      </View>
    );
  }
  if (pedido.estado === 'LISTO_PARA_DELIVERY') {
    return (
      <View style={[s.actionsSingle, s.waiting]}>
        <Icon name="bike" size={14} color={t.colors.textMuted} />
        <Text variant="small" color="textMuted">
          Esperando al repartidor
        </Text>
      </View>
    );
  }
  return null;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: t.spacing[2] },
    codeBlock: { gap: 1 },
    code: { color: t.colors.textPrimary, fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
    espera: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] },
    items: { marginTop: t.spacing[2], lineHeight: 19 },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: t.spacing[2] },
    actionsRow: {
      flexDirection: 'row',
      gap: t.spacing[2],
      marginTop: t.spacing[3],
      paddingTop: t.spacing[3],
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
    },
    actionItem: { flex: 1 },
    actionsSingle: {
      marginTop: t.spacing[3],
      paddingTop: t.spacing[3],
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
    },
    waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.spacing[1] },
  });
}
