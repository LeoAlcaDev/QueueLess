import { Button, Card, Chip } from '@/components/ui';
import { TIPO_RECLAMO_LABELS, type ReclamoResponse } from '@/types';
import { formatFechaHora } from '../utils';

interface ClaimCardProps {
  reclamo: ReclamoResponse;
  onResponder: () => void;
}

// Tarjeta de un reclamo o queja recibido. Muestra la constancia, el tipo, el detalle y el
// plazo. Si sigue pendiente ofrece responder dentro de la app; si ya se respondio muestra la
// respuesta registrada.
export function ClaimCard({ reclamo, onResponder }: ClaimCardProps) {
  const pendiente = reclamo.estado === 'PENDIENTE';
  return (
    <Card pad="md" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-small font-bold text-ink">{TIPO_RECLAMO_LABELS[reclamo.tipo]}</div>
          <div className="mt-0.5 font-mono text-[12px] text-ink-muted">
            {reclamo.codigoConstancia} · {formatFechaHora(reclamo.creadoAt)}
          </div>
        </div>
        <Chip tone={pendiente ? 'warning' : 'success'} icon={pendiente ? 'clock' : 'checkCircle'}>
          {pendiente ? 'Pendiente' : 'Respondido'}
        </Chip>
      </div>

      <p className="text-[13px] leading-snug text-ink-soft">{reclamo.detalle}</p>

      {reclamo.respuesta ? (
        <div className="rounded-input border-l-[3px] border-accent bg-surface-muted p-3">
          <div className="ql-section-label mb-1 text-ink-soft">Tu respuesta</div>
          <p className="text-[13px] leading-snug text-ink">{reclamo.respuesta}</p>
          {reclamo.respondidoAt && (
            <p className="mt-1.5 text-[12px] text-ink-muted">Respondido el {formatFechaHora(reclamo.respondidoAt)}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="text-[12px] font-semibold text-warning-fg">
            Responde antes de {formatFechaHora(reclamo.plazoRespuestaAt)}
          </span>
          <Button size="sm" icon="send" onClick={onResponder}>
            Responder
          </Button>
        </div>
      )}
    </Card>
  );
}
