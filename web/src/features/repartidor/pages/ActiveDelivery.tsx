import { Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { endpoints, http } from '@/api';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/cn';
import { usePageChrome } from '@/components/layout';
import { Button, Card, EmptyState, Field, Icon, Skeleton, StateBanner } from '@/components/ui';
import type { ConfirmarEntregaRequest, EstadoSolicitudDelivery, SolicitudDeliveryResponse } from '@/types';
import { ErrorState, useToastOnError } from '../components';

interface CodigoForm {
  codigo: string;
}

const STEPS = ['Recoger', 'Entregar'];

function stepFromEstado(estado: EstadoSolicitudDelivery): number {
  if (estado === 'RECOGIDO') return 1;
  if (estado === 'ENTREGADO') return 2;
  return 0;
}

// Indicador de progreso recoger -> entregar. Sin mapa: el seguimiento por mapa es de la
// app movil, en web basta con los dos pasos.
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center py-1">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <Fragment key={label}>
            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className={cn(
                  'grid h-[30px] w-[30px] place-items-center rounded-pill border-2 text-[12px] font-bold',
                  done || active
                    ? 'border-brand-strong bg-brand-strong text-on-brand'
                    : 'border-line bg-surface-muted text-ink-muted',
                )}
              >
                {done ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('text-small', active ? 'font-bold text-ink' : 'font-medium text-ink-muted')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={cn('mx-2.5 h-0.5 flex-1', done ? 'bg-brand-strong' : 'bg-line')} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function PlaceCard({
  label,
  icon,
  title,
  sub,
  tone,
}: {
  label: string;
  icon: 'store' | 'mapPinned';
  title: string;
  sub?: string;
  tone?: 'points';
}) {
  return (
    <Card>
      <div className="ql-section-label mb-2">{label}</div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-input',
            tone === 'points' ? 'bg-points-soft text-points-strong' : 'bg-surface-muted text-ink-muted',
          )}
        >
          <Icon name={icon} size={22} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-ink">{title}</div>
          {sub && <div className="truncate text-[12.5px] text-ink-soft">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

// Entrega que el repartidor tiene en curso. No hay endpoint de "mi entrega activa", asi que
// el id llega por query (?id=, sobrevive al refresco) con el state de navegacion de respaldo.
// Segun el estado: ASIGNADO confirma la recogida; RECOGIDO escribe el codigo del cliente
// para cerrar la entrega (aqui se cierra a mano porque el escaneo de QR es solo del movil).
export default function ActiveDelivery() {
  usePageChrome('Entrega activa', {
    sub: 'Recoge el pedido y entrégalo en la zona',
    maxWidth: 560,
  });
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const stateId = (location.state as { id?: number } | null)?.id ?? null;
  const queryId = searchParams.get('id');
  const id = queryId != null ? Number(queryId) : stateId;

  const { data, loading, error, refetch } = useApi<SolicitudDeliveryResponse | null>(
    (signal) => {
      if (id == null) return Promise.resolve(null);
      return http.get<SolicitudDeliveryResponse>(endpoints.repartidor.solicitud(id), { signal });
    },
    [id],
  );

  const recoger = useAsyncAction(() => {
    if (id == null) return Promise.reject(new Error('Sin solicitud'));
    return http.post<SolicitudDeliveryResponse>(endpoints.repartidor.confirmarRecogida(id));
  });

  const entregar = useAsyncAction((body: ConfirmarEntregaRequest) => {
    if (id == null) return Promise.reject(new Error('Sin solicitud'));
    return http.post<SolicitudDeliveryResponse>(endpoints.repartidor.confirmarEntrega(id), body);
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CodigoForm>({ defaultValues: { codigo: '' } });

  useToastOnError(recoger.error);
  // un codigo equivocado vuelve como 422; ademas del toast lo marcamos en el campo
  useToastOnError(entregar.error, (err) => setError('codigo', { message: err.message }));

  const onRecoger = () => {
    recoger.run().then((result) => {
      if (result) {
        toast.success('Pedido recogido. Llévalo a la zona de entrega.');
        refetch();
      }
    });
  };

  const onEntregar = handleSubmit((values) => {
    const body: ConfirmarEntregaRequest = { codigo: values.codigo.trim() };
    entregar.run(body).then((result) => {
      if (result) {
        toast.success('¡Entrega confirmada! Ganaste 50 QueuePoints.');
        navigate(paths.repartidor.entregas);
      }
    });
  });

  if (id == null) {
    return (
      <EmptyState
        icon="bike"
        title="No tienes una entrega en curso"
        description="Acepta una solicitud para empezar a repartir."
        action={<Button onClick={() => navigate(paths.repartidor.solicitudes)}>Ver solicitudes</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="self-start">
        <Button
          variant="ghost"
          size="sm"
          icon="arrowLeft"
          onClick={() => navigate(paths.repartidor.solicitudes)}
        >
          Solicitudes
        </Button>
      </div>

      {loading ? (
        <Card className="flex flex-col gap-3">
          <Skeleton width="55%" height={20} />
          <Skeleton width="40%" />
          <Skeleton width="70%" />
          <Skeleton height={44} rounded="rounded-button" />
        </Card>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data ? (
        <EmptyState icon="package" title="No encontramos la solicitud" />
      ) : (
        <>
          <Stepper step={stepFromEstado(data.estado)} />
          <PlaceCard
            label="Recoger en"
            icon="store"
            title={data.puntoDeVentaNombre}
            sub={data.puntoDeVentaUbicacion}
          />
          <PlaceCard
            label="Entregar a"
            icon="mapPinned"
            title={data.zonaEntrega}
            sub="Zona de entrega del cliente"
            tone="points"
          />

          {data.estado === 'ASIGNADO' && (
            <>
              <StateBanner tone="points">Ganarás 50 QueuePoints al completar esta entrega.</StateBanner>
              <Button icon="handPlatter" full loading={recoger.loading} onClick={onRecoger}>
                Confirmar recogida
              </Button>
            </>
          )}

          {data.estado === 'RECOGIDO' && (
            <form onSubmit={onEntregar} className="flex flex-col gap-3.5">
              <StateBanner tone="info">
                El escáner por cámara está en la app móvil. En web confirma la entrega con el código del
                cliente.
              </StateBanner>
              <Field
                label="Código del cliente"
                placeholder="QL-7F3A"
                autoComplete="off"
                error={errors.codigo?.message}
                {...register('codigo', { required: 'Ingresa el código de entrega' })}
              />
              <Button type="submit" icon="checkCheck" full loading={entregar.loading}>
                Confirmar entrega
              </Button>
            </form>
          )}

          {data.estado === 'ENTREGADO' && (
            <>
              <StateBanner tone="success" title="Entrega completada">
                Ganaste 50 QueuePoints por esta entrega.
              </StateBanner>
              <Button
                variant="secondary"
                icon="package"
                full
                onClick={() => navigate(paths.repartidor.entregas)}
              >
                Ver mis entregas
              </Button>
            </>
          )}

          {(data.estado === 'BUSCANDO' ||
            data.estado === 'SIN_REPARTIDOR' ||
            data.estado === 'CANCELADO') && (
            <StateBanner tone="warning" title="Esta solicitud no está activa">
              {data.estado === 'BUSCANDO'
                ? 'La solicitud aún busca repartidor. Acéptala desde Solicitudes.'
                : 'La solicitud ya no está disponible.'}
            </StateBanner>
          )}
        </>
      )}
    </div>
  );
}
