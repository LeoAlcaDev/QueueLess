import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import type { PedidoResponse } from '@/api';
import { Card, QrImage, Screen, StatusBadge, SummaryRow, Text } from '@/components';
import { TopBar } from '../components';

export function QrScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const pedido: PedidoResponse = route.params?.pedido;
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const delivery = pedido.estado === 'LISTO_PARA_DELIVERY';

  return (
    <Screen scroll padded={false} header={<TopBar title="QR de entrega" onBack={() => navigation.goBack()} />}>
      <View style={s.content}>
        <StatusBadge estado={pedido.estado} />

        <QrImage orderId={pedido.id} size={240} />

        <Text variant="display" color="textPrimary" style={s.code}>
          {pedido.codigo}
        </Text>

        <Text variant="body" color="textSecondary" align="center">
          Muestra este código {delivery ? 'al repartidor' : 'en el mostrador'} para recoger tu pedido.
        </Text>

        <Card padding={14} style={s.summary}>
          <View style={s.summaryInner}>
            {pedido.items.map((it) => (
              <SummaryRow
                key={it.id}
                label={`${it.cantidad}× ${it.nombre}`}
                value={`S/ ${it.subtotal.toFixed(2)}`}
              />
            ))}
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[6], gap: t.spacing[4], alignItems: 'center' },
    code: { fontVariant: ['tabular-nums'], letterSpacing: 2 },
    summary: { width: '100%' },
    summaryInner: { gap: t.spacing[2] },
  });
}
