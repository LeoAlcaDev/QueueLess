import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Avatar, Button, Card, Chip, Icon, type IconName, Screen, Text, Toggle } from '@/components/ui';
import { ScreenHeader, ROLE_META } from '@/features/common/components';
import { useAuth, ROLES, ROLE_LABELS, tokenStorage } from '@/auth';
import { useBiometricAuth, useToast } from '@/hooks';
import { ApiError } from '@/api';
import type { Rol } from '@/api/types';

const PERFIL_RUTA: Record<Rol, string> = {
  CLIENTE: 'PerfilCliente',
  COMERCIO: 'PerfilComercio',
  REPARTIDOR: 'PerfilRepartidor',
};

// Mi cuenta: identidad, edición de perfiles según los roles del usuario, cambio y
// alta de rol, seguridad (desbloqueo biométrico), términos, reclamos y cierre de
// sesión. Las pantallas de detalle están registradas a nivel raíz.
export function SettingsScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const { user, roles, logout, activarRol, clearActiveRole } = useAuth();
  const biometric = useBiometricAuth();
  const toast = useToast();

  const [biometriaActiva, setBiometriaActiva] = useState(false);
  const [activando, setActivando] = useState<Rol | null>(null);

  useEffect(() => {
    tokenStorage.getBiometricEnabled().then(setBiometriaActiva);
  }, []);

  if (!user) return null;

  const rolesFaltantes = ROLES.filter((rol) => !roles.includes(rol));

  async function cambiarBiometria(siguiente: boolean) {
    if (siguiente) {
      const ok = await biometric.authenticate('Confirma tu identidad para activar el desbloqueo');
      if (!ok) return;
      await tokenStorage.setBiometricEnabled(true);
      setBiometriaActiva(true);
      toast.success('Activaste el desbloqueo con biometría.');
    } else {
      await tokenStorage.setBiometricEnabled(false);
      setBiometriaActiva(false);
    }
  }

  async function onActivarRol(rol: Rol) {
    setActivando(rol);
    try {
      await activarRol(rol);
      // al activar, refrescamos la sesión y entramos al panel del rol nuevo
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No pudimos activar ese rol.');
      setActivando(null);
    }
  }

  return (
    <Screen
      scroll
      padded
      header={
        <ScreenHeader
          title="Mi cuenta"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
      }
    >
      <View style={s.root}>
        <View style={s.perfil}>
          <Avatar name={user.nombreCompleto} size={84} />
          <Text variant="h3" align="center">
            {user.nombreCompleto}
          </Text>
          <Text variant="small" color="textMuted" align="center">
            {user.email}
          </Text>
          <View style={s.chips}>
            {roles.map((rol) => (
              <Chip
                key={rol}
                label={ROLE_LABELS[rol]}
                tone={rol === 'REPARTIDOR' ? 'points' : 'brand'}
                icon={ROLE_META[rol].icon}
                size="sm"
              />
            ))}
          </View>
        </View>

        <View style={s.seccion}>
          <Text variant="sectionLabel">Tus perfiles</Text>
          <Card padding={0}>
            {roles.map((rol, indice) => (
              <Fila
                key={rol}
                icon={ROLE_META[rol].icon}
                label={`Perfil de ${ROLE_LABELS[rol].toLowerCase()}`}
                onPress={() => navigation.navigate(PERFIL_RUTA[rol])}
                conBorde={indice > 0}
              />
            ))}
            {roles.length > 1 ? (
              <Fila icon="refresh" label="Cambiar de rol" onPress={() => clearActiveRole()} conBorde />
            ) : null}
          </Card>
        </View>

        {rolesFaltantes.length > 0 ? (
          <View style={s.seccion}>
            <Text variant="sectionLabel">Activar otro rol</Text>
            {rolesFaltantes.map((rol) => (
              <Card key={rol}>
                <View style={s.activarFila}>
                  <View style={s.activarIcono}>
                    <Icon name={ROLE_META[rol].icon} size={18} color={t.colors.textBrand} />
                  </View>
                  <View style={s.activarTextos}>
                    <Text variant="label" color="textPrimary">
                      {ROLE_LABELS[rol]}
                    </Text>
                    <Text variant="small" color="textSecondary">
                      {ROLE_META[rol].invitacion}
                    </Text>
                  </View>
                  <Button
                    title="Activar"
                    variant="secondary"
                    size="sm"
                    leftIcon="plus"
                    onPress={() => onActivarRol(rol)}
                    loading={activando === rol}
                  />
                </View>
              </Card>
            ))}
            <Text variant="small" color="textMuted">
              Al activar un rol nuevo refrescamos tu sesión para darte acceso a su panel.
            </Text>
          </View>
        ) : null}

        <View style={s.seccion}>
          <Text variant="sectionLabel">Seguridad</Text>
          <Card>
            <Toggle
              value={biometriaActiva}
              onValueChange={cambiarBiometria}
              disabled={!biometric.available}
              label="Acceso con biometría"
              sub={
                biometric.available
                  ? 'Desbloquea la app con tu huella o rostro.'
                  : 'No disponible en este dispositivo.'
              }
            />
          </Card>
        </View>

        <View style={s.seccion}>
          <Text variant="sectionLabel">Más</Text>
          <Card padding={0}>
            <Fila icon="fileText" label="Términos y condiciones" onPress={() => navigation.navigate('Tyc')} />
            <Fila
              icon="clipboard"
              label="Libro de reclamaciones"
              onPress={() => navigation.navigate('Reclamos')}
              conBorde
            />
          </Card>
        </View>

        <Button title="Cerrar sesión" variant="outline" leftIcon="logOut" onPress={() => logout()} fullWidth />
      </View>
    </Screen>
  );
}

interface FilaProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  conBorde?: boolean;
  right?: ReactNode;
}

// fila navegable dentro de una card de ajustes: ícono, etiqueta y flecha
function Fila({ icon, label, onPress, conBorde = false, right }: FilaProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.fila, conBorde && s.filaBorde, pressed && s.filaPressed]}>
      <View style={s.filaIcono}>
        <Icon name={icon} size={18} color={t.colors.textSecondary} />
      </View>
      <Text variant="body" style={s.filaLabel}>
        {label}
      </Text>
      {right ?? <Icon name="chevronRight" size={20} color={t.colors.textMuted} />}
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[6] },
    perfil: { alignItems: 'center', gap: t.spacing[2] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1], justifyContent: 'center', marginTop: t.spacing[1] },
    seccion: { gap: t.spacing[2] },
    fila: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingHorizontal: t.spacing[4], paddingVertical: t.spacing[3] },
    filaBorde: { borderTopWidth: 1, borderTopColor: t.colors.borderDefault },
    filaPressed: { opacity: 0.7 },
    filaIcono: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: t.colors.bgSurface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filaLabel: { flex: 1 },
    activarFila: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    activarIcono: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: t.colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activarTextos: { flex: 1, gap: 2 },
  });
}
