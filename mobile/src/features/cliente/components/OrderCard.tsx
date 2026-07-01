import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { TIPO_ENTREGA_LABELS, formatDateTime } from '@/lib';
import type { PedidoResponse } from '@/api';
import { Card, Icon, Price, StatusBadge, Text } from '@/components';

export interface OrderCardProps {
  pedido: PedidoResponse;
  onPress: () => void;
}

// Card de un pedido en "Mis pedidos". El backend no devuelve el nombre del local
// en el listado, así que el código manda como título y abajo van los items.
export function OrderCard({ pedido, onPress }: OrderCardProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const resumen = pedido.items.map((it) => `${it.cantidad}× ${it.nombre}`).join(' · ');

  return (
    <Card padding={14} onPress={onPress}>
      <View style={s.header}>
        <Text variant="label" color="textPrimary" style={s.code}>
          {pedido.codigo}
        </Text>
        <StatusBadge estado={pedido.estado} size="sm" />
      </View>
      <Text variant="small" color="textSecondary" numberOfLines={1} style={s.items}>
        {resumen}
      </Text>
      <View style={s.footer}>
        <View style={s.meta}>
          <Icon
            name={pedido.tipoEntrega === 'DELIVERY' ? 'users' : 'shoppingBag'}
            size={13}
            color={t.colors.textMuted}
          />
          <Text variant="small" color="textMuted">
            {TIPO_ENTREGA_LABELS[pedido.tipoEntrega]} · {formatDateTime(pedido.creadoAt)}
          </Text>
        </View>
        <Price amount={pedido.total} size="sm" />
      </View>
    </Card>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[2] },
    code: { fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
    items: { marginTop: t.spacing[2] },
    footer: {
      marginTop: t.spacing[2],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    meta: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1], flex: 1 },
  });
}
