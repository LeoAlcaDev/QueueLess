import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon = 'package', title, message, action }: EmptyStateProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={s.root}>
      <View style={s.iconChip}>
        <Icon name={icon} size={28} color={t.colors.textMuted} strokeWidth={1.5} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" align="center">
          {message}
        </Text>
      ) : null}
      {action ? (
        <View style={s.action}>
          <Button title={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { alignItems: 'center', paddingVertical: t.spacing[12], paddingHorizontal: t.spacing[6], gap: t.spacing[3] },
    iconChip: {
      width: 64,
      height: 64,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.bgSurface2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing[1],
    },
    action: { marginTop: t.spacing[2] },
  });
}
