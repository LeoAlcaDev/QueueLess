import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon, type IconName } from '@/components/ui';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

// Botón solo-ícono sobre superficie, para acciones secundarias de las listas
// (editar, borrar). Hit target de 44 con el hitSlop, según la guía de la app.
export function IconButton({ icon, onPress, label, tone = 'default', disabled = false }: IconButtonProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const color = tone === 'danger' ? t.colors.errorFg : t.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.base, disabled && s.disabled, pressed && !disabled && s.pressed]}
    >
      <Icon name={icon} size={18} color={color} />
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    base: {
      width: 38,
      height: 38,
      borderRadius: t.radii.input,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.bgSurface2,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
    },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.8 },
  });
}
