import { useEffect, useState } from 'react';
import { Button, Field, Modal } from '@/components/ui';

interface CodeEntryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (codigo: string) => void;
  loading?: boolean;
}

// Cierre de entrega por codigo: el cliente muestra el codigo de su pedido y el comercio lo
// digita para confirmar la entrega.
export function CodeEntryModal({ open, onClose, onConfirm, loading }: CodeEntryModalProps) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCodigo('');
      setError('');
    }
  }, [open]);

  const submit = () => {
    const limpio = codigo.trim();
    if (!limpio) {
      setError('Ingresa el código del pedido');
      return;
    }
    onConfirm(limpio);
  };

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-h3 font-bold text-ink">Confirmar entrega</h2>
          <p className="mt-1 text-small text-ink-soft">
            Pide al cliente el código de su pedido e ingrésalo para cerrar la entrega.
          </p>
        </div>
        <Field
          label="Código del pedido"
          placeholder="Ej. QL-4821"
          value={codigo}
          error={error}
          autoFocus
          onChange={(e) => {
            setCodigo(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <div className="flex gap-2.5">
          <Button variant="secondary" full onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button full loading={loading} onClick={submit}>
            Confirmar entrega
          </Button>
        </div>
      </div>
    </Modal>
  );
}
