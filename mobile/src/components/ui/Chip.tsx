import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { toneColors, type StatusTone } from '@/lib';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  tone?: StatusTone;
  icon?: IconName;
  size?: 'sm' | 'md';
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, tone = 'neutral', icon, size = 'md', selected = false, onPress }: ChipProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const palette = toneColors(t.colors, tone);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.base,
        size === 'sm' ? s.sm : s.md,
        { backgroundColor: palette.bg },
        selected && { borderColor: palette.dot, borderWidth: 1 },
        pressed && onPress && s.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 12 : 14} color={palette.fg} /> : null}
      <Text variant={size === 'sm' ? 'badge' : 'label'} style={{ color: palette.fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[1],
      borderRadius: t.radii.pill,
      alignSelf: 'flex-start',
    },
    sm: { paddingVertical: 4, paddingHorizontal: t.spacing[2] },
    md: { paddingVertical: t.spacing[2], paddingHorizontal: t.spacing[3] },
    pressed: { opacity: 0.8 },
  });
}
