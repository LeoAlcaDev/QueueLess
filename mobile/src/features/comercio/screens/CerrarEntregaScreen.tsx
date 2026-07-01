import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ApiError, api, endpoints, normalizeError } from '@/api';
import type { ConfirmarEntregaRequest } from '@/api/types';
import { Button, Field, Icon, Screen, Text } from '@/components';
import { useToast } from '@/hooks';
import { ComercioHeader } from '../components';

export function CerrarEntregaScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { pedidoId } = route.params as { pedidoId: number };
  const toast = useToast();

  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [entregado, setEntregado] = useState(false);

  async function confirmar() {
    const limpio = codigo.trim();
    if (limpio.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const body: ConfirmarEntregaRequest = { codigo: limpio };
      await api.post(endpoints.comercio.pedidoAccion(pedidoId, 'marcar-entregado'), body);
      setEntregado(true);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      // 422: el código del cliente no coincide; lo mostramos junto al campo
      if (apiError.kind === 'business' || apiError.kind === 'validation') {
        setError(apiError.message);
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (entregado) {
    return (
      <Screen header={<ComercioHeader title="Cerrar entrega" onBack={() => navigation.popToTop()} />}>
        <View style={s.success}>
          <View style={s.successIcon}>
            <Icon name="checkCheck" size={40} color={t.colors.successFg} />
          </View>
          <Text variant="h2" align="center">
            Pedido entregado
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            El código coincide. El pedido salió de tu cola.
          </Text>
          <View style={s.successCta}>
            <Button title="Volver a la cola" onPress={() => navigation.popToTop()} fullWidth />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll header={<ComercioHeader title="Cerrar entrega" onBack={() => navigation.goBack()} />}>
      <View style={s.intro}>
        <View style={s.introIcon}>
          <Icon name="scan" size={32} color={t.colors.textBrand} />
        </View>
        <Text variant="body" color="textSecondary" align="center">
          Pídele al cliente su código QL-XXXX o escanea su QR para confirmar la entrega.
        </Text>
      </View>

      <View style={s.form}>
        <Field
          label="Código del cliente"
          value={codigo}
          onChangeText={(value) => {
            setCodigo(value);
            if (error) setError(null);
          }}
          placeholder="QL-7F3A"
          autoCapitalize="characters"
          error={error ?? undefined}
        />
        <Button title="Confirmar entrega" onPress={confirmar} loading={busy} disabled={codigo.trim().length === 0} fullWidth />
        <Button
          title="Escanear QR"
          variant="outline"
          leftIcon="camera"
          onPress={() => navigation.navigate('Escanear', { pedidoId })}
          fullWidth
        />
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    intro: { alignItems: 'center', gap: t.spacing[3], paddingVertical: t.spacing[4] },
    introIcon: {
      width: 64,
      height: 64,
      borderRadius: t.radii.modal,
      backgroundColor: t.colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    form: { gap: t.spacing[3] },
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
