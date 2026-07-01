import { http, endpoints } from '@/api';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { Button, Icon, IconButton, Modal, Spinner, StateBanner } from '@/components/ui';
import type { TycEstadoResponse } from '@/types';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
  // se llama cuando el usuario acaba de aceptar la version vigente
  onAccepted?: () => void;
}

const PARRAFOS = [
  'QueueLess es una plataforma para pre-ordenar comida en los puntos de venta de UTEC y recogerla con un código QR. Al usarla aceptas pedir solo con fines personales dentro del campus.',
  'Los pagos se procesan a través de la pasarela del punto de venta. Una vez confirmado el pago, la preparación del pedido queda a cargo del comercio según su disponibilidad y horario.',
  'Los QueuePoints se otorgan a los repartidores por cada entrega completada. Son un beneficio interno, no tienen valor monetario y pueden ajustarse o revertirse ante un uso indebido.',
  'Eres responsable de la información de tu cuenta y de recoger tus pedidos a tiempo. QueueLess puede actualizar estos términos y te pedirá aceptar la nueva versión cuando eso ocurra.',
];

// Cuerpo del modal de terminos. Vive aparte para que solo se monte (y recien ahi consulte
// el estado de aceptacion) cuando el modal esta abierto, no antes.
function TermsModalBody({ onClose, onAccepted }: { onClose: () => void; onAccepted?: () => void }) {
  const toast = useToast();
  const { data, loading, error, refetch } = useApi(
    (signal) => http.get<TycEstadoResponse>(endpoints.tyc.estado, { signal }),
    [],
  );

  const aceptar = useAsyncAction(async () => {
    await http.post(endpoints.tyc.aceptar);
    return true;
  });

  const handleAceptar = async () => {
    const ok = await aceptar.run();
    if (!ok) {
      toast.error('No pudimos registrar tu aceptación. Intenta de nuevo.');
      return;
    }
    toast.success('Aceptaste los términos y condiciones');
    refetch();
    if (onAccepted) onAccepted();
  };

  // hay version nueva sin aceptar solo cuando ya se habia aceptado una version anterior
  const versionNueva = Boolean(data && !data.aceptoVersionVigente && data.versionAceptada);

  return (
    <div className="flex flex-col">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-brand-soft text-brand-text">
              <Icon name="fileText" size={20} />
            </span>
            <div>
              <h2 className="text-h3 font-bold text-ink">Términos y Condiciones</h2>
              <p className="text-[12.5px] text-ink-muted">
                {data ? `Versión vigente · ${data.versionVigente}` : 'Cargando versión…'}
              </p>
            </div>
          </div>
          <IconButton icon="x" label="Cerrar" onClick={onClose} />
        </div>

        {versionNueva && (
          <div className="mt-3">
            <StateBanner tone="warning" title="Hay una versión actualizada">
              Aceptaste la {data?.versionAceptada}. Revisa los cambios y vuelve a aceptar para continuar.
            </StateBanner>
          </div>
        )}
      </div>

      <div className="space-y-4 px-5 py-5">
        {PARRAFOS.map((parrafo) => (
          <p key={parrafo} className="text-small leading-relaxed text-ink-soft">
            {parrafo}
          </p>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-small text-ink-muted">
            <Spinner size={16} />
            Cargando estado de aceptación…
          </div>
        )}

        {error && <StateBanner tone="error">{error.message}</StateBanner>}

        {data && data.aceptoVersionVigente && (
          <StateBanner tone="success" title="Términos aceptados">
            Aceptaste la versión vigente ({data.versionVigente}).
          </StateBanner>
        )}

        {data && !data.aceptoVersionVigente && !data.versionAceptada && (
          <StateBanner tone="warning" title="Aún no aceptas los términos">
            Versión vigente {data.versionVigente}. Acéptala para continuar usando QueueLess.
          </StateBanner>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {data && !data.aceptoVersionVigente && (
          <Button icon="check" loading={aceptar.loading} onClick={handleAceptar}>
            Aceptar términos
          </Button>
        )}
      </div>
    </div>
  );
}

// Modal de terminos y condiciones. Sirve como contenido del enlace "Términos" en el registro
// y tambien desde Mi cuenta para ver el estado y aceptar cuando hay una version nueva.
export function TermsModal({ open, onClose, onAccepted }: TermsModalProps) {
  return (
    <Modal open={open} onClose={onClose} width={460}>
      <TermsModalBody onClose={onClose} onAccepted={onAccepted} />
    </Modal>
  );
}
