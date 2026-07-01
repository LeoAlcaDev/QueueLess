import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Palette, Theme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
}

type VariantPaint = {
  background: string;
  text: string;
  border: string;
  spinner: keyof Palette;
};

// Cada variante resuelve su fondo, color de texto y borde sobre la paleta activa.
function variantPaint(c: Palette, variant: ButtonVariant): VariantPaint {
  switch (variant) {
    case 'secondary':
      return { background: c.bgSurface2, text: c.textPrimary, border: 'transparent', spinner: 'textPrimary' };
    case 'outline':
      return { background: 'transparent', text: c.textPrimary, border: c.borderDefault, spinner: 'textPrimary' };
    case 'ghost':
      return { background: 'transparent', text: c.textBrand, border: 'transparent', spinner: 'textBrand' };
    case 'danger':
      return { background: c.errorDot, text: c.onBrand, border: 'transparent', spinner: 'onBrand' };
    case 'primary':
    default:
      return { background: c.brandStrong, text: c.onBrand, border: 'transparent', spinner: 'onBrand' };
  }
}

const SIZE_TOKENS: Record<ButtonSize, { fontSize: number; iconSize: number }> = {
  sm: { fontSize: 14, iconSize: 16 },
  md: { fontSize: 16, iconSize: 18 },
  lg: { fontSize: 17, iconSize: 20 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const paint = variantPaint(t.colors, variant);
  const sizeToken = SIZE_TOKENS[size];
  const isDisabled = disabled || loading;
  const borderWidth = variant === 'outline' ? 1 : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.base,
        s[size],
        { backgroundColor: paint.background, borderColor: paint.border, borderWidth },
        fullWidth && s.fullWidth,
        isDisabled && s.disabled,
        pressed && !isDisabled && s.pressed,
      ]}
    >
      {loading ? (
        <Spinner size="sm" color={paint.spinner} />
      ) : (
        <View style={s.content}>
          {leftIcon ? <Icon name={leftIcon} size={sizeToken.iconSize} color={paint.text} /> : null}
          <Text variant="label" style={[s.label, { color: paint.text, fontSize: sizeToken.fontSize }]}>
            {title}
          </Text>
          {rightIcon ? <Icon name={rightIcon} size={sizeToken.iconSize} color={paint.text} /> : null}
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radii.button,
    },
    sm: { paddingVertical: t.spacing[2], paddingHorizontal: t.spacing[3], minHeight: 40 },
    md: { paddingVertical: t.spacing[3], paddingHorizontal: t.spacing[4], minHeight: 48 },
    lg: { paddingVertical: t.spacing[4], paddingHorizontal: t.spacing[6], minHeight: 56 },
    content: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] },
    label: { fontFamily: t.fontFamily.semibold },
    fullWidth: { alignSelf: 'stretch', width: '100%' },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.9 },
  });
}
