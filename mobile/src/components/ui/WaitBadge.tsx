import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { formatWaitMinutes, toneColors, waitTone } from '@/lib';
import { Icon } from './Icon';
import { Text } from './Text';

export interface WaitBadgeProps {
  minutes: number;
}

export function WaitBadge({ minutes }: WaitBadgeProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const palette = toneColors(t.colors, waitTone(minutes));

  return (
    <View style={[s.base, { backgroundColor: palette.bg }]}>
      <Icon name="clock" size={14} color={palette.fg} />
      <Text variant="badge" style={{ color: palette.fg }}>
        {formatWaitMinutes(minutes)}
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
      paddingVertical: 5,
      paddingHorizontal: t.spacing[3],
      borderRadius: t.radii.pill,
      alignSelf: 'flex-start',
    },
  });
}
