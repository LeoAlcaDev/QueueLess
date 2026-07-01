import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';

export interface CardProps {
  children: ReactNode;
  variant?: 'elevated' | 'outlined' | 'plain';
  padding?: number;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Por defecto la card va sin sombra: vive sobre bgPage con 1px de borde. La sombra
// se reserva para la variante elevada (flotantes).
export function Card({ children, variant = 'outlined', padding = 16, onPress, selected = false, style }: CardProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const containerStyle: StyleProp<ViewStyle> = [
    s.base,
    { padding },
    variant === 'elevated' && s.elevated,
    variant === 'outlined' && s.outlined,
    selected && s.selected,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [containerStyle, pressed && s.pressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    base: {
      backgroundColor: t.colors.bgSurface,
      borderRadius: t.radii.card,
    },
    outlined: { borderWidth: 1, borderColor: t.colors.borderDefault },
    elevated: { ...t.shadow.md },
    selected: { borderWidth: 1.5, borderColor: t.colors.brand },
    pressed: { opacity: 0.9 },
  });
}
