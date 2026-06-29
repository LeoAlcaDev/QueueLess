import { ocupacionApi } from "@/api";
import { Modal, Spinner } from "@/components/ui";
import { useFetch } from "@/hooks";
import { userFacingMessage } from "@/lib/errors";
import { OcupacionCurva } from "@/features/cliente/components/OcupacionCurva";

/** Ocupación por franja de un local (GET /comercio/ocupacion/{id}). Reusa la curva del cliente. */
export function OcupacionModal({
  puntoDeVentaId,
  nombre,
  open,
  onClose,
}: {
  puntoDeVentaId: number;
  nombre: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data, loading, error } = useFetch(
    () => ocupacionApi.getOcupacionComercio(puntoDeVentaId),
    [puntoDeVentaId, open],
  );

  return (
    <Modal open={open} onClose={onClose} title={`Ocupación · ${nombre}`}>
      {loading ? (
        <div className="grid min-h-[8rem] place-items-center">
          <Spinner size={22} />
        </div>
      ) : error || !data ? (
        <p className="text-small text-content-secondary">
          {userFacingMessage(error)}
        </p>
      ) : (
        <OcupacionCurva ocupacion={data} />
      )}
    </Modal>
  );
}
