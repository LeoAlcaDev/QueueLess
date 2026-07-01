import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon, Text } from '@/components/ui';

export interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  // acción secundaria a la derecha (un ícono, un chip, etc.)
  right?: ReactNode;
}

// Cabecera de pantalla para los stacks con headerShown en false: flecha de volver
// a la izquierda, título y una acción opcional a la derecha. El SafeArea lo pone el
// componente Screen que la envuelve.
export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={s.root}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={s.back}>
          <Icon name="chevronLeft" size={24} color={t.colors.textPrimary} />
        </Pressable>
      ) : null}
      {title ? (
        <Text variant="h3" numberOfLines={1} style={s.title}>
          {title}
        </Text>
      ) : (
        <View style={s.title} />
      )}
      {right ?? null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[2],
      minHeight: 56,
      paddingHorizontal: t.spacing[4],
      paddingVertical: t.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgSurface,
    },
    back: { marginLeft: -t.spacing[1] },
    title: { flex: 1 },
  });
}
