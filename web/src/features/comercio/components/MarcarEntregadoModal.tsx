import { useState } from "react";
import { Button, Input, Modal } from "@/components/ui";

interface MarcarEntregadoModalProps {
  open: boolean;
  onClose: () => void;
  codigoPedido: string;
  submitting?: boolean;
  onConfirm: (codigo: string) => void;
}

/**
 * Cierre de entrega pickup: el comercio teclea el código que muestra el cliente.
 * 400 si falta el código, 422 si no coincide (lo reporta quien llama vía toast).
 */
export function MarcarEntregadoModal({
  open,
  onClose,
  codigoPedido,
  submitting,
  onConfirm,
}: MarcarEntregadoModalProps) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirmar() {
    if (!codigo.trim()) {
      setError("Ingresa el código que muestra el cliente.");
      return;
    }
    setError(null);
    onConfirm(codigo.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Entregar pedido #${codigoPedido}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={submitting} onClick={confirmar}>
            Confirmar entrega
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-body text-content-secondary">
          Pídele al cliente el código de su QR y escríbelo para cerrar la
          entrega.
        </p>
        <Input
          label="Código de entrega"
          autoFocus
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Ej. A1B2C3"
          error={error ?? undefined}
        />
      </div>
    </Modal>
  );
}
