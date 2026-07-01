import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import type { MotivoCancelacion } from '@/api/types';
import { MOTIVO_CANCELACION_LABELS, MOTIVOS_COMERCIO } from '@/lib';
import { Button, Modal, Select, Text, TextArea } from '@/components/ui';

export interface RejectModalProps {
  visible: boolean;
  codigo?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (motivo: MotivoCancelacion, detalle: string) => void;
}

const OPCIONES = MOTIVOS_COMERCIO.map((motivo) => ({ value: motivo, label: MOTIVO_CANCELACION_LABELS[motivo] }));

// Hoja para rechazar un pedido: el comercio elige el motivo y, si quiere, agrega
// detalle. Al confirmar se reembolsa el total al cliente.
export function RejectModal({ visible, codigo, loading = false, onClose, onConfirm }: RejectModalProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [motivo, setMotivo] = useState<MotivoCancelacion>(MOTIVOS_COMERCIO[0]);
  const [detalle, setDetalle] = useState('');

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={codigo ? `Rechazar ${codigo}` : 'Rechazar pedido'}
      footer={
        <View style={s.actions}>
          <View style={s.action}>
            <Button title="Cancelar" variant="outline" onPress={onClose} disabled={loading} fullWidth />
          </View>
          <View style={s.action}>
            <Button
              title="Rechazar pedido"
              variant="danger"
              onPress={() => onConfirm(motivo, detalle.trim())}
              loading={loading}
              fullWidth
            />
          </View>
        </View>
      }
    >
      <View style={s.body}>
        <Text variant="small" color="textSecondary">
          Se reembolsa el total al cliente. Cuéntale el motivo.
        </Text>
        <Select
          label="Motivo"
          value={motivo}
          onChange={(value) => setMotivo(value as MotivoCancelacion)}
          options={OPCIONES}
        />
        <TextArea
          label="Detalle (opcional)"
          value={detalle}
          onChangeText={setDetalle}
          numberOfLines={3}
          maxLength={300}
          placeholder="Agrega contexto para el cliente…"
        />
      </View>
    </Modal>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    body: { gap: t.spacing[3] },
    actions: { flexDirection: 'row', gap: t.spacing[2] },
    action: { flex: 1 },
  });
}
