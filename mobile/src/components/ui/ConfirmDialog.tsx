import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button } from './Button';
import { Modal } from './Modal';
import { Text } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      title={title}
      sheet={false}
      dismissOnBackdrop={!loading}
      footer={
        <View style={s.actions}>
          <View style={s.action}>
            <Button title={cancelLabel} variant="outline" onPress={onCancel} disabled={loading} fullWidth />
          </View>
          <View style={s.action}>
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              fullWidth
            />
          </View>
        </View>
      }
    >
      {message ? (
        <Text variant="body" color="textSecondary">
          {message}
        </Text>
      ) : null}
    </Modal>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    actions: { flexDirection: 'row', gap: t.spacing[2] },
    action: { flex: 1 },
  });
}
