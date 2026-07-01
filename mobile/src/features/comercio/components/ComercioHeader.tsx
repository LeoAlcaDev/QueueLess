import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon, Text } from '@/components/ui';

export interface ComercioHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

// Encabezado de las pantallas de detalle del comercio: flecha de regreso a la
// izquierda, título y una acción opcional a la derecha. Las pantallas raíz de cada
// tab no lo usan (llevan su título dentro del contenido).
export function ComercioHeader({ title, subtitle, onBack, right }: ComercioHeaderProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={s.root}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={s.back} accessibilityRole="button" accessibilityLabel="Volver">
          <Icon name="chevronLeft" size={24} color={t.colors.textPrimary} />
        </Pressable>
      ) : null}
      <View style={s.titles}>
        <Text variant="h3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={s.right}>{right}</View> : null}
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
    back: { marginLeft: -t.spacing[1] },
    titles: { flex: 1, gap: 1 },
    right: { marginLeft: 'auto' },
  });
}
