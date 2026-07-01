import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { initials } from '@/lib';
import { Text } from './Text';

export interface AvatarProps {
  name?: string;
  size?: number;
  tone?: 'brand' | 'points';
}

export function Avatar({ name, size = 40, tone = 'brand' }: AvatarProps) {
  const t = useTheme();

  const background = tone === 'points' ? t.colors.pointsSoft : t.colors.brandSoft;
  const textColor = tone === 'points' ? t.colors.pointsStrong : t.colors.textBrand;
  // la variante "label" trae un lineHeight fijo de 20 que corta las iniciales en los
  // avatares grandes; subimos el alto de línea junto con el tamaño para que quepan
  const fontSize = Math.round(size * 0.4);

  return (
    <View style={[styles.root, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
      <Text variant="label" style={{ color: textColor, fontSize, lineHeight: Math.round(fontSize * 1.2) }}>
        {initials(name ?? '')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
});
