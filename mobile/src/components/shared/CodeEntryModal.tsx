import { useState } from 'react';
import { Button, Field, Modal } from '@/components/ui';

export interface CodeEntryModalProps {
  visible: boolean;
  title?: string;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

export function CodeEntryModal({ visible, title = 'Ingresar código', onSubmit, onCancel }: CodeEntryModalProps) {
  const [code, setCode] = useState('');

  function submit() {
    const trimmed = code.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setCode('');
  }

  function cancel() {
    setCode('');
    onCancel();
  }

  return (
    <Modal
      visible={visible}
      onClose={cancel}
      title={title}
      sheet
      footer={<Button title="Confirmar" onPress={submit} fullWidth />}
    >
      <Field
        label="Código"
        value={code}
        onChangeText={setCode}
        placeholder="Escribe el código"
        autoCapitalize="characters"
        autoFocus
      />
    </Modal>
  );
}
