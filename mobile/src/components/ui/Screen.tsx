import { useMemo, type ReactElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import type { Palette, Theme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  background?: keyof Palette;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  header,
  footer,
  refreshControl,
  background = 'bgPage',
}: ScreenProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: t.colors[background] }]}>
      {header}

      {scroll ? (
        <ScrollView
          style={s.flex}
          contentContainerStyle={padded ? s.paddedContent : undefined}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.flex, padded && s.padded]}>{children}</View>
      )}

      {footer ? <View style={[s.footer, { backgroundColor: t.colors[background] }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    padded: { padding: t.spacing[4] },
    paddedContent: { padding: t.spacing[4] },
    footer: {
      paddingHorizontal: t.spacing[4],
      paddingVertical: t.spacing[3],
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
    },
  });
}
