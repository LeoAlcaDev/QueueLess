import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon, Text } from '@/components';

export interface TopBarProps {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}

// Cabecera de las pantallas de detalle del cliente: botón de volver + título. Va
// dentro del Screen, que ya resuelve el safe area de arriba.
export function TopBar({ title, onBack, right }: TopBarProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={s.root}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={s.back}>
          <Icon name="chevronLeft" size={24} color={t.colors.textPrimary} />
        </Pressable>
      ) : (
        <View style={s.back} />
      )}
      <Text variant="h3" numberOfLines={1} style={s.title}>
        {title ?? ''}
      </Text>
      <View style={s.right}>{right}</View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[2],
      paddingHorizontal: t.spacing[4],
      paddingVertical: t.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgPage,
    },
    back: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
    title: { flex: 1 },
    right: { minWidth: 32, alignItems: 'flex-end' },
  });
}
