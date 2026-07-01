import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { tokenStorage, useAuth } from '@/auth';
import type { Rol } from '@/api';
import { useBiometricAuth, useToast } from '@/hooks';
import { Avatar, Button, Card, Chip, Icon, type IconName, Screen, Text, Toggle } from '@/components';

const ROL_LABELS: Record<Rol, string> = { CLIENTE: 'Cliente', COMERCIO: 'Comercio', REPARTIDOR: 'Repartidor' };

interface MenuItem {
  icon: IconName;
  label: string;
  route: string;
}
const MENU: MenuItem[] = [
  { icon: 'userRound', label: 'Mis preferencias', route: 'PerfilCliente' },
  { icon: 'messageCircle', label: 'Reclamos', route: 'Reclamos' },
  { icon: 'settings', label: 'Mi cuenta', route: 'Settings' },
  { icon: 'fileText', label: 'Términos y condiciones', route: 'Tyc' },
];

export function PerfilScreen() {
  const navigation = useNavigation<any>();
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { user, logout } = useAuth();
  const biometric = useBiometricAuth();
  const toast = useToast();

  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    tokenStorage.getBiometricEnabled().then((value) => {
      if (active) setBioEnabled(value);
    });
    return () => {
      active = false;
    };
  }, []);

  async function toggleBiometric(next: boolean) {
    if (!next) {
      await tokenStorage.setBiometricEnabled(false);
      setBioEnabled(false);
      return;
    }
    if (!biometric.available) {
      toast.warning('Tu equipo no tiene huella ni rostro configurados.');
      return;
    }
    const ok = await biometric.authenticate('Confirma tu identidad para activar el bloqueo');
    if (!ok) return;
    await tokenStorage.setBiometricEnabled(true);
    setBioEnabled(true);
    toast.success('Bloqueo biométrico activado');
  }

  return (
    <Screen scroll padded={false}>
      <View style={s.content}>
        <View style={s.header}>
          <Avatar name={user?.nombreCompleto} size={64} />
          <View style={s.headerInfo}>
            <Text variant="h3">{user?.nombreCompleto ?? ''}</Text>
            <Text variant="small" color="textMuted">
              {user?.email ?? ''}
            </Text>
            <View style={s.roles}>
              {(user?.roles ?? []).map((rol) => (
                <Chip key={rol} label={ROL_LABELS[rol]} tone="brand" size="sm" />
              ))}
            </View>
          </View>
        </View>

        <Card padding={16}>
          <Toggle
            value={bioEnabled}
            onValueChange={toggleBiometric}
            label="Bloqueo biométrico"
            sub="Pide tu huella o rostro al abrir la app"
            disabled={biometric.checking}
          />
        </Card>

        <Card padding={0}>
          {MENU.map((item, index) => (
            <Pressable
              key={item.route}
              onPress={() => navigation.navigate(item.route)}
              style={[s.row, index > 0 && s.rowBorder]}
            >
              <View style={s.rowIcon}>
                <Icon name={item.icon} size={18} color={t.colors.textSecondary} />
              </View>
              <Text variant="label" color="textPrimary" style={s.rowLabel}>
                {item.label}
              </Text>
              <Icon name="chevronRight" size={18} color={t.colors.textMuted} />
            </Pressable>
          ))}
        </Card>

        <Button title="Cerrar sesión" variant="outline" leftIcon="logOut" onPress={() => logout()} fullWidth />
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4], gap: t.spacing[4] },
    header: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    headerInfo: { flex: 1, gap: 2 },
    roles: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1], marginTop: t.spacing[1] },
    row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingVertical: 14, paddingHorizontal: t.spacing[4] },
    rowBorder: { borderTopWidth: 1, borderTopColor: t.colors.borderDefault },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.colors.bgSurface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1 },
  });
}
