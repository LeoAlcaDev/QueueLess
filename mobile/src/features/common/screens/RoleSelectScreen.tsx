import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Card, Chip, Icon, Screen, Text } from '@/components/ui';
import { ScreenHeader, ROLE_META } from '@/features/common/components';
import { useAuth, ROLE_LABELS } from '@/auth';
import { useToast } from '@/hooks';
import type { Rol } from '@/api/types';

// Selector de rol activo. Aparece cuando la cuenta tiene varios roles y aún no se
// eligió con cuál entrar, o al venir de "Cambiar de rol" en la cuenta. Al elegir,
// el rol queda activo y el RootNavigator remonta el panel correspondiente.
export function RoleSelectScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const { roles, activeRole, switchRole } = useAuth();
  const toast = useToast();

  async function elegir(rol: Rol) {
    try {
      await switchRole(rol);
    } catch {
      toast.error('No pudimos cambiar de rol. Intenta de nuevo.');
    }
  }

  return (
    <Screen
      scroll
      padded
      header={
        <ScreenHeader
          title="Elige tu rol"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
      }
    >
      <View style={s.root}>
        <Text variant="small" color="textSecondary">
          ¿Con qué cuenta quieres entrar? Puedes cambiar de rol cuando quieras desde tu cuenta.
        </Text>

        <View style={s.lista}>
          {roles.map((rol) => {
            const meta = ROLE_META[rol];
            const esActual = rol === activeRole;
            return (
              <Card key={rol} onPress={() => elegir(rol)} selected={esActual}>
                <View style={s.fila}>
                  <View style={s.icono}>
                    <Icon name={meta.icon} size={20} color={t.colors.textBrand} />
                  </View>
                  <View style={s.textos}>
                    <View style={s.tituloFila}>
                      <Text variant="label" color="textPrimary">
                        {ROLE_LABELS[rol]}
                      </Text>
                      {esActual ? <Chip label="Activo" tone="brand" size="sm" /> : null}
                    </View>
                    <Text variant="small" color="textSecondary">
                      {meta.subtitulo}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={20} color={t.colors.textMuted} />
                </View>
              </Card>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[4] },
    lista: { gap: t.spacing[2] },
    fila: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    icono: {
      width: 40,
      height: 40,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textos: { flex: 1, gap: 2 },
    tituloFila: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] },
  });
}
