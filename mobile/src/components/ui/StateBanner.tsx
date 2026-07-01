import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { toneColors, type StatusTone } from '@/lib';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface StateBannerProps {
  tone: StatusTone;
  title?: string;
  message: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
}

// ícono por defecto según el tono, cuando el llamador no pasa uno
const DEFAULT_ICON: Record<StatusTone, IconName> = {
  success: 'checkCircle',
  warning: 'alertTriangle',
  error: 'alertCircle',
  info: 'info',
  neutral: 'info',
  brand: 'sparkles',
  points: 'bolt',
};

export function StateBanner({ tone, title, message, icon, action }: StateBannerProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const palette = toneColors(t.colors, tone);
  const iconName = icon ?? DEFAULT_ICON[tone];

  return (
    <View style={[s.root, { backgroundColor: palette.bg }]}>
      <Icon name={iconName} size={20} color={palette.fg} />
      <View style={s.body}>
        {title ? (
          <Text variant="label" style={{ color: palette.fg }}>
            {title}
          </Text>
        ) : null}
        <Text variant="small" style={{ color: palette.fg }}>
          {message}
        </Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={6} style={s.action}>
            <Text variant="label" style={[s.actionText, { color: palette.fg }]}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      gap: t.spacing[2],
      padding: t.spacing[3],
      borderRadius: t.radii.card,
    },
    body: { flex: 1, gap: 2 },
    action: { marginTop: t.spacing[1], alignSelf: 'flex-start' },
    actionText: { textDecorationLine: 'underline' },
  });
}
