import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ORDER_STATE_LABELS, ORDER_STATE_TONE, toneColors, type StatusTone } from '@/lib';
import type { EstadoPedido } from '@/api/types';
import { Text } from './Text';

export interface StatusBadgeProps {
  estado?: EstadoPedido;
  tone?: StatusTone;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ estado, tone, label, size = 'md' }: StatusBadgeProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const resolvedTone: StatusTone = tone ?? (estado ? ORDER_STATE_TONE[estado] : 'neutral');
  const resolvedLabel = label ?? (estado ? ORDER_STATE_LABELS[estado] : '');
  const palette = toneColors(t.colors, resolvedTone);

  return (
    <View style={[s.base, size === 'sm' ? s.sm : s.md, { backgroundColor: palette.bg }]}>
      <View style={[s.dot, { backgroundColor: palette.dot }]} />
      <Text variant="badge" style={{ color: palette.fg }}>
        {resolvedLabel}
      </Text>
    </View>
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
    sm: { paddingVertical: 3, paddingHorizontal: t.spacing[2] },
    md: { paddingVertical: 5, paddingHorizontal: t.spacing[3] },
    dot: { width: 6, height: 6, borderRadius: t.radii.pill },
  });
}
