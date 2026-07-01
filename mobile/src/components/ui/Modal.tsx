import { useMemo, type ReactNode } from 'react';
import { Modal as RNModal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  sheet?: boolean;
  dismissOnBackdrop?: boolean;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  footer,
  sheet = true,
  dismissOnBackdrop = true,
}: ModalProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();

  function handleBackdrop() {
    if (dismissOnBackdrop) onClose();
  }

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={sheet ? 'slide' : 'fade'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={[s.backdrop, sheet ? s.backdropSheet : s.backdropCenter]} onPress={handleBackdrop}>
        <Pressable
          // tocar el contenido no debe cerrar; este Pressable atrapa el toque del backdrop
          onPress={() => {}}
          style={[sheet ? s.sheet : s.card, sheet ? { paddingBottom: insets.bottom + t.spacing[4] } : null]}
        >
          {sheet ? <View style={s.handle} /> : null}

          {title ? (
            <View style={s.header}>
              <Text variant="h3" style={s.title}>
                {title}
              </Text>
              <Pressable onPress={onClose} hitSlop={8} style={s.close}>
                <Icon name="x" size={20} color={t.colors.textSecondary} />
              </Pressable>
            </View>
          ) : null}

          <ScrollView style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          {footer ? <View style={s.footer}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: t.colors.bgOverlay },
    backdropSheet: { justifyContent: 'flex-end' },
    backdropCenter: { justifyContent: 'center', alignItems: 'center', padding: t.spacing[6] },
    sheet: {
      backgroundColor: t.colors.bgSurface,
      borderTopLeftRadius: t.radii.modal,
      borderTopRightRadius: t.radii.modal,
      paddingHorizontal: t.spacing[4],
      paddingTop: t.spacing[3],
      maxHeight: '88%',
      ...t.shadow.lg,
    },
    card: {
      backgroundColor: t.colors.bgSurface,
      borderRadius: t.radii.modal,
      padding: t.spacing[4],
      width: '100%',
      maxWidth: 420,
      maxHeight: '82%',
      ...t.shadow.lg,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.borderStrong,
      marginBottom: t.spacing[3],
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing[3] },
    title: { flex: 1 },
    close: { padding: t.spacing[1] },
    body: { flexShrink: 1 },
    bodyContent: { paddingBottom: t.spacing[1] },
    footer: { marginTop: t.spacing[4], gap: t.spacing[2] },
  });
}
