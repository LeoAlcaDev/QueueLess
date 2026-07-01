import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Icon, Screen, Text } from '@/components/ui';
import { BrandMark } from './BrandMark';

export interface NotFoundScreenProps {
  onHome?: () => void;
}

// Pantalla 404 presentacional: el "404" gigante con la marca encima y una salida
// clara. Se usa cuando una ruta no existe o el contenido ya no está.
export function NotFoundScreen({ onHome }: NotFoundScreenProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Screen padded scroll={false}>
      <View style={s.root}>
        <View style={s.marca}>
          <Text variant="display" style={s.codigo}>
            404
          </Text>
          <View style={s.marcaCentro}>
            <BrandMark size={48} />
          </View>
        </View>
        <Text variant="h3" align="center">
          Esta página no existe
        </Text>
        <Text variant="small" color="textSecondary" align="center">
          Puede que el enlace esté roto o que el contenido ya no esté disponible.
        </Text>
        {onHome ? <Button title="Volver al inicio" leftIcon="house" onPress={onHome} /> : null}
      </View>
    </Screen>
  );
}

export interface OfflineScreenProps {
  onRetry?: () => void;
}

// Pantalla de sin conexión / error de carga: ícono, mensaje calmo y reintento.
export function OfflineScreen({ onRetry }: OfflineScreenProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Screen padded scroll={false}>
      <View style={s.root}>
        <View style={s.iconoChip}>
          <Icon name="wifiOff" size={38} color={t.colors.textMuted} strokeWidth={1.6} />
        </View>
        <Text variant="h3" align="center">
          Sin conexión
        </Text>
        <Text variant="small" color="textSecondary" align="center">
          No pudimos cargar el contenido. Revisa tu conexión y vuelve a intentarlo.
        </Text>
        {onRetry ? <Button title="Reintentar" leftIcon="refresh" onPress={onRetry} /> : null}
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing[3] },
    marca: { alignItems: 'center', justifyContent: 'center' },
    codigo: { fontSize: 88, lineHeight: 96, color: t.colors.bgSurface2 },
    marcaCentro: { position: 'absolute' },
    iconoChip: {
      width: 84,
      height: 84,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.bgSurface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
