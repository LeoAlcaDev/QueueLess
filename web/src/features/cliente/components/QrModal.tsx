import { useEffect, useState } from "react";
import { Modal, Spinner } from "@/components/ui";
import { fetchQrBlobUrl, revokeBlobUrl } from "@/lib/qr";
import { userFacingMessage } from "@/lib/errors";

interface QrModalProps {
  pedidoId: number;
  codigo: string;
  open: boolean;
  onClose: () => void;
}

/** Muestra el QR de entrega (PNG bajado con Authorization → blob URL). */
export function QrModal({ pedidoId, codigo, open, onClose }: QrModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let blob: string | null = null;
    let cancelled = false;
    setUrl(null);
    setError(null);
    fetchQrBlobUrl(pedidoId)
      .then((u) => {
        if (cancelled) {
          revokeBlobUrl(u);
          return;
        }
        blob = u;
        setUrl(u);
      })
      .catch((err) => !cancelled && setError(userFacingMessage(err)));
    return () => {
      cancelled = true;
      revokeBlobUrl(blob);
    };
  }, [open, pedidoId]);

  return (
    <Modal open={open} onClose={onClose} title="Código de entrega">
      <div className="flex flex-col items-center gap-4 py-2">
        {error ? (
          <p className="text-small text-error-fg">{error}</p>
        ) : url ? (
          <img
            src={url}
            alt="Código QR del pedido"
            className="h-56 w-56 rounded-card"
          />
        ) : (
          <div className="grid h-56 w-56 place-items-center">
            <Spinner size={24} />
          </div>
        )}
        <p className="text-center text-small text-content-secondary">
          Muestra este QR al recogerlo. Código:{" "}
          <span className="font-semibold tracking-wider text-content">
            {codigo}
          </span>
        </p>
      </div>
    </Modal>
  );
}
