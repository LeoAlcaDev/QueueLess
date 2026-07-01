import { useEffect, useState } from 'react';
import { Button, Modal, TextArea } from '@/components/ui';
import type { ReclamoResponse } from '@/types';
import { TIPO_RECLAMO_LABELS } from '@/types';

interface RespondClaimModalProps {
  reclamo: ReclamoResponse | null;
  onClose: () => void;
  onConfirm: (respuesta: string) => void;
  loading?: boolean;
}

// Modal para responder un reclamo o queja recibido. El reclamo abierto define el contenido;
// si es null el modal esta cerrado.
export function RespondClaimModal({ reclamo, onClose, onConfirm, loading }: RespondClaimModalProps) {
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (reclamo) {
      setRespuesta('');
      setError('');
    }
  }, [reclamo]);

  const submit = () => {
    const limpio = respuesta.trim();
    if (!limpio) {
      setError('Escribe una respuesta');
      return;
    }
    onConfirm(limpio);
  };

  return (
    <Modal open={Boolean(reclamo)} onClose={onClose} width={500}>
      {reclamo && (
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-h3 font-bold text-ink">
              Responder {TIPO_RECLAMO_LABELS[reclamo.tipo].toLowerCase()}
            </h2>
            <p className="mt-1 text-small text-ink-soft">
              Constancia {reclamo.codigoConstancia}
            </p>
          </div>
          <div className="rounded-input bg-surface-muted p-3.5 text-small leading-relaxed text-ink-soft">
            {reclamo.detalle}
          </div>
          <TextArea
            label="Tu respuesta"
            placeholder="Explica al cliente cómo se resolverá"
            rows={4}
            value={respuesta}
            error={error}
            onChange={(e) => {
              setRespuesta(e.target.value);
              setError('');
            }}
          />
          <div className="flex gap-2.5">
            <Button variant="secondary" full onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button full loading={loading} onClick={submit}>
              Enviar respuesta
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
