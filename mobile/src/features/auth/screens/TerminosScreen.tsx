import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Icon, Screen, Text } from '@/components/ui';
import { ScreenHeader, TermsBody } from '@/features/common/components';
import { useAuth } from '@/auth';
import { useToast } from '@/hooks';
import { api, ApiError, endpoints } from '@/api';

// Términos y condiciones del acceso. Se llega aquí desde el registro para leerlos
// antes de aceptar. Si ya hay sesión, "Aceptar y continuar" registra la aceptación
// contra el backend; si no, solo vuelve (el consentimiento queda en el checkbox del
// registro y la aceptación formal se exige luego en la pantalla de términos de la
// cuenta).
export function TerminosScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const { status } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function onAceptar() {
    setLoading(true);
    try {
      if (status === 'authenticated') {
        await api.post(endpoints.tyc.aceptar(), {});
      }
      navigation.goBack();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No pudimos registrar tu aceptación.');
      setLoading(false);
    }
  }

  return (
    <Screen
      scroll
      padded
      header={<ScreenHeader title="Términos y condiciones" onBack={() => navigation.goBack()} />}
      footer={
        <View style={s.footer}>
          <View style={s.footerAction}>
            <Button title="Ahora no" variant="outline" onPress={() => navigation.goBack()} fullWidth />
          </View>
          <View style={s.footerAction}>
            <Button title="Aceptar y continuar" onPress={onAceptar} loading={loading} fullWidth />
          </View>
        </View>
      }
    >
      <View style={s.root}>
        <View style={s.encabezado}>
          <View style={s.icono}>
            <Icon name="fileText" size={20} color={t.colors.textBrand} />
          </View>
          <View style={s.encabezadoTextos}>
            <Text variant="h3">Términos y Condiciones</Text>
            <Text variant="small" color="textMuted">
              Léelos y acéptalos para usar QueueLess.
            </Text>
          </View>
        </View>

        <TermsBody />
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[4] },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    icono: {
      width: 40,
      height: 40,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    encabezadoTextos: { flex: 1 },
    footer: { flexDirection: 'row', gap: t.spacing[2] },
    footerAction: { flex: 1 },
  });
}
