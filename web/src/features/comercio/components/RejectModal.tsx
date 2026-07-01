import { useEffect, useState } from 'react';
import { Button, Modal, Select, TextArea } from '@/components/ui';
import { MOTIVO_CANCELACION_LABELS, type MotivoCancelacion, type MotivoCancelacionRequest } from '@/types';
import { MOTIVOS_COMERCIO } from '../utils';

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: MotivoCancelacionRequest) => void;
  loading?: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
}

// Modal de motivo para rechazar o cancelar un pedido. Pide un motivo de la lista del
// comercio y un detalle opcional; el envio real lo maneja quien lo abre.
export function RejectModal({
  open,
  onClose,
  onConfirm,
  loading,
  title,
  description,
  confirmLabel = 'Confirmar',
}: RejectModalProps) {
  const [motivo, setMotivo] = useState<MotivoCancelacion | ''>('');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setMotivo('');
      setDetalle('');
      setError('');
    }
  }, [open]);

  const options = MOTIVOS_COMERCIO.map((m) => ({ value: m, label: MOTIVO_CANCELACION_LABELS[m] }));

  const submit = () => {
    if (!motivo) {
      setError('Elige un motivo');
      return;
    }
    onConfirm({ motivo, detalle: detalle.trim() ? detalle.trim() : null });
  };

  return (
    <Modal open={open} onClose={onClose} width={460}>
      <div className="flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-h3 font-bold text-ink">{title}</h2>
          {description && <p className="mt-1 text-small text-ink-soft">{description}</p>}
        </div>
        <Select
          label="Motivo"
          placeholder="Selecciona un motivo"
          options={options}
          value={motivo}
          error={error}
          onChange={(e) => {
            setMotivo(e.target.value as MotivoCancelacion);
            setError('');
          }}
        />
        <TextArea
          label="Detalle (opcional)"
          placeholder="Agrega un detalle para el cliente"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />
        <div className="flex gap-2.5">
          <Button variant="secondary" full onClick={onClose} disabled={loading}>
            Volver
          </Button>
          <Button variant="destructive" full loading={loading} onClick={submit}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
