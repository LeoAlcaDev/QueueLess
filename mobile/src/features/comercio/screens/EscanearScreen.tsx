import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ApiError, api, endpoints, normalizeError } from '@/api';
import type { ConfirmarEntregaRequest } from '@/api/types';
import { Button, Icon, QrScanner, Screen, Text } from '@/components';
import { useToast } from '@/hooks';
import { ComercioHeader } from '../components';

export function EscanearScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { pedidoId } = route.params as { pedidoId: number };
  const toast = useToast();

  const [entregado, setEntregado] = useState(false);
  const [busy, setBusy] = useState(false);
  // remontamos el escáner tras un fallo: el lector solo dispara una vez por montaje
  const [intento, setIntento] = useState(0);

  async function confirmar(codigo: string) {
    if (busy) return;
    setBusy(true);
    try {
      const body: ConfirmarEntregaRequest = { codigo: codigo.trim() };
      await api.post(endpoints.comercio.pedidoAccion(pedidoId, 'marcar-entregado'), body);
      setEntregado(true);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      toast.error(apiError.message);
      setIntento((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  if (entregado) {
    return (
      <Screen header={<ComercioHeader title="Escanear entrega" onBack={() => navigation.popToTop()} />}>
        <View style={s.success}>
          <View style={s.successIcon}>
            <Icon name="checkCheck" size={40} color={t.colors.successFg} />
          </View>
          <Text variant="h2" align="center">
            Pedido entregado
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Código verificado. El pedido salió de tu cola.
          </Text>
          <View style={s.successCta}>
            <Button title="Volver a la cola" onPress={() => navigation.popToTop()} fullWidth />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <View style={s.camera}>
      <QrScanner
        key={intento}
        onScan={confirmar}
        onCancel={() => navigation.goBack()}
        hint="Apunta al QR del cliente. ¿No funciona? Ingresa el código a mano."
        allowManual
      />
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    camera: { flex: 1, backgroundColor: '#1C1917' },
    success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing[3], paddingHorizontal: t.spacing[6] },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.successBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successCta: { alignSelf: 'stretch', marginTop: t.spacing[2] },
  });
}
