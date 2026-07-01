import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

// Confirmacion para acciones que conviene pensar dos veces (cancelar un pedido, borrar un
// producto). El boton de confirmar se pone rojo cuando la accion es destructiva.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="flex flex-col gap-2 p-6">
        <h2 className="text-h3 font-bold text-ink">{title}</h2>
        {description && <p className="text-small leading-relaxed text-ink-soft">{description}</p>}
        <div className="mt-3 flex gap-2.5">
          <Button variant="secondary" full onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            full
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
