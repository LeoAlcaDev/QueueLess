import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { useBiometricAuth } from '@/hooks';
import { Button, Icon, Text } from '@/components/ui';

interface LockScreenProps {
  onUnlock: () => void;
  onUsePassword: () => void;
}

// Pantalla de bloqueo cuando el usuario activó el acceso con biometría: protege la
// sesión guardada al abrir la app. Intenta el desbloqueo apenas aparece, y deja
// salir a la contraseña si el usuario prefiere otra cuenta.
export function LockScreen({ onUnlock, onUsePassword }: LockScreenProps) {
  const theme = useTheme();
  const { authenticate } = useBiometricAuth();
  const [verificando, setVerificando] = useState(false);

  const desbloquear = async () => {
    setVerificando(true);
    try {
      const ok = await authenticate('Desbloquea QueueLess');
      if (ok) onUnlock();
    } finally {
      setVerificando(false);
    }
  };

  useEffect(() => {
    desbloquear();
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bgPage }]}>
      <View style={styles.center}>
        <View style={[styles.badge, { backgroundColor: theme.colors.brandSoft }]}>
          <Icon name="lock" size={32} color={theme.colors.textBrand} />
        </View>
        <Text variant="h2" align="center">
          Sesión bloqueada
        </Text>
        <Text variant="small" color="textSecondary" align="center">
          Desbloquea con tu huella o rostro para continuar.
        </Text>
        <View style={styles.actions}>
          <Button title="Desbloquear" onPress={desbloquear} loading={verificando} fullWidth leftIcon="lock" />
          <Button title="Usar otra cuenta" onPress={onUsePassword} variant="ghost" fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  badge: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actions: { width: '100%', gap: 10, marginTop: 12 },
});
