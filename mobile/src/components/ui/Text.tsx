import type { ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Palette, Theme } from '@/theme';

export interface TextProps {
  variant?: keyof Theme['type'];
  color?: keyof Palette;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}

// Cada preset de theme.type ya trae color, tamaño y tracking; solo pisamos el color
// cuando el llamador pide uno distinto, y dejamos que style mande al final.
export function Text({ variant = 'body', color, align, numberOfLines, style, children }: TextProps) {
  const t = useTheme();
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        t.type[variant],
        color ? { color: t.colors[color] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
