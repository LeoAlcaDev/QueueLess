import { useState, type FormEvent } from "react";
import { Button, Input, Modal } from "@/components/ui";

interface ConfirmarEntregaModalProps {
  open: boolean;
  onClose: () => void;
  loading?: boolean;
  /** Devuelve el código que escribe el repartidor; el padre maneja el 422. */
  onConfirm: (codigo: string) => void;
}

/** Pide el código del cliente para cerrar la entrega (+50 QueuePoints). */
export function ConfirmarEntregaModal({
  open,
  onClose,
  loading,
  onConfirm,
}: ConfirmarEntregaModalProps) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | undefined>();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) {
      setError("Ingresa el código que muestra el cliente.");
      return;
    }
    setError(undefined);
    onConfirm(codigo.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar entrega"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="confirmar-entrega-form" loading={loading}>
            Confirmar entrega
          </Button>
        </div>
      }
    >
      <form
        id="confirmar-entrega-form"
        onSubmit={onSubmit}
        className="flex flex-col gap-3"
      >
        <p className="text-body text-content-secondary">
          Pídele al cliente el código de su QR y escríbelo para cerrar la
          entrega. Ganas 50 QueuePoints al confirmarla.
        </p>
        <Input
          label="Código del cliente"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value);
            if (error) setError(undefined);
          }}
          error={error}
          autoFocus
        />
      </form>
    </Modal>
  );
}
