import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { http, endpoints, type PageResponse } from '@/api';
import { zodResolver } from '@/lib/form';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { useAuth } from '@/auth';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  Modal,
  Segmented,
  Select,
  Skeleton,
  StateBanner,
  TextArea,
} from '@/components/ui';
import { paths } from '@/routes/paths';
import {
  DESTINATARIO_RECLAMO_LABELS,
  ESTADO_RECLAMO_LABELS,
  TIPO_RECLAMO_LABELS,
  type AcuseReclamoResponse,
  type CrearReclamoRequest,
  type PedidoResponse,
  type PuntoDeVentaResponse,
  type ReclamoResponse,
} from '@/types';
import { AccountFrame } from '../components/AccountFrame';

// fecha corta local, para la constancia y la marca de tiempo del reclamo
function formatFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

const reclamoSchema = z
  .object({
    tipo: z.enum(['RECLAMO', 'QUEJA']),
    contra: z.enum(['COMERCIO', 'PLATAFORMA']),
    puntoDeVentaId: z.string().optional(),
    pedidoId: z.string().optional(),
    detalle: z.string().min(10, 'Cuéntanos con un poco más de detalle (mínimo 10 caracteres).'),
  })
  .refine((data) => data.contra !== 'COMERCIO' || Boolean(data.puntoDeVentaId), {
    path: ['puntoDeVentaId'],
    message: 'Indica el local del reclamo.',
  });
type ReclamoValues = z.infer<typeof reclamoSchema>;

// Libro de reclamaciones personal: cualquier usuario autenticado puede dejar un reclamo o
// queja (contra un comercio o la plataforma) y ver los suyos con su codigo de constancia. Se
// llega desde Mi cuenta. Hoy las respuestas se coordinan por correo, fuera de la app.
export default function Reclamos() {
  const toast = useToast();
  const { user, status, roles } = useAuth();
  const esCliente = roles.includes('CLIENTE');

  const mios = useApi<ReclamoResponse[]>((signal) => http.get(endpoints.reclamos.mios, { signal }), []);
  const locales = useApi<PuntoDeVentaResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.list, { signal }),
    [],
  );
  // el pedido relacionado solo aplica a quien es cliente; los demas no tienen pedidos propios
  const pedidos = useApi<PageResponse<PedidoResponse> | null>(
    (signal) =>
      esCliente
        ? http.getPage(endpoints.cliente.pedidos.base, { params: { page: 0, size: 50 }, signal })
        : Promise.resolve(null),
    [esCliente],
  );

  const [abierto, setAbierto] = useState(false);
  const [acuse, setAcuse] = useState<AcuseReclamoResponse | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<ReclamoValues>({
    resolver: zodResolver(reclamoSchema),
    defaultValues: { tipo: 'RECLAMO', contra: 'COMERCIO', puntoDeVentaId: '', pedidoId: '', detalle: '' },
  });
  const contra = watch('contra');

  const crear = useAsyncAction((body: CrearReclamoRequest) =>
    http.post<AcuseReclamoResponse>(endpoints.reclamos.create, body),
  );

  useEffect(() => {
    const err = crear.error;
    if (err?.kind === 'validation') {
      for (const [field, message] of Object.entries(err.fieldErrorMap)) {
        setError(field as keyof ReclamoValues, { message });
      }
    }
  }, [crear.error, setError]);

  if (status === 'loading') {
    return (
      <AccountFrame
        title="Libro de reclamaciones"
        backTo={{ to: paths.cuenta, label: 'Volver a Mi cuenta' }}
        maxWidth={820}
      >
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} height={108} rounded="rounded-card" />
          ))}
        </div>
      </AccountFrame>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return <Navigate to={paths.login} replace />;
  }

  const abrir = () => {
    reset({ tipo: 'RECLAMO', contra: 'COMERCIO', puntoDeVentaId: '', pedidoId: '', detalle: '' });
    setAbierto(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    const body: CrearReclamoRequest = {
      tipo: values.tipo,
      contra: values.contra,
      puntoDeVentaId:
        values.contra === 'COMERCIO' && values.puntoDeVentaId ? Number(values.puntoDeVentaId) : null,
      pedidoId: values.pedidoId ? Number(values.pedidoId) : null,
      detalle: values.detalle,
    };
    const res = await crear.run(body);
    if (res) {
      setAbierto(false);
      setAcuse(res);
      toast.success('Reclamo registrado.');
      mios.refetch();
    }
  });

  const bannerForm = crear.error && crear.error.kind !== 'validation' ? crear.error.message : null;
  const nombreLocal = (id: number | null) =>
    id != null ? (locales.data ?? []).find((l) => l.id === id)?.nombre : undefined;

  return (
    <AccountFrame
      title="Libro de reclamaciones"
      backTo={{ to: paths.cuenta, label: 'Volver a Mi cuenta' }}
      maxWidth={820}
    >
      <div className="flex flex-col gap-5">
        <StateBanner tone="info" icon="info" title="Tus respuestas llegan por correo">
          Por ahora te respondemos los reclamos a tu correo{user.email ? ` (${user.email})` : ''}, no dentro de la
          app. Revisa tu bandeja de entrada.
        </StateBanner>

        <Button icon="plus" className="self-start" onClick={abrir}>
          Nuevo reclamo
        </Button>

        {acuse && (
          <StateBanner tone="success" title="Reclamo registrado">
            {acuse.mensaje} Tu código de constancia es{' '}
            <strong className="font-mono">{acuse.codigoConstancia}</strong>.
          </StateBanner>
        )}

        {mios.loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} height={108} rounded="rounded-card" />
            ))}
          </div>
        ) : mios.error ? (
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-small text-ink-soft">{mios.error.message}</p>
            <Button variant="secondary" icon="refresh" onClick={mios.refetch}>
              Reintentar
            </Button>
          </Card>
        ) : (mios.data ?? []).length === 0 ? (
          <EmptyState
            icon="messageCircle"
            title="No tienes reclamos"
            description="Si algo sale mal con un pedido, puedes dejar un reclamo o queja aquí."
            action={
              <Button icon="plus" onClick={abrir}>
                Crear reclamo
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {(mios.data ?? []).map((reclamo) => {
              const objeto =
                reclamo.contra === 'COMERCIO'
                  ? (nombreLocal(reclamo.puntoDeVentaId) ?? 'Un comercio')
                  : 'La plataforma';
              const respondido = reclamo.estado === 'RESPONDIDO';
              return (
                <Card key={reclamo.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-small font-bold text-ink">
                        {TIPO_RECLAMO_LABELS[reclamo.tipo]} · {objeto}
                      </div>
                      <div className="font-mono text-[12px] text-ink-muted">
                        {reclamo.codigoConstancia} · {formatFecha(reclamo.creadoAt)}
                      </div>
                    </div>
                    <Chip tone={respondido ? 'success' : 'warning'} size="sm">
                      {ESTADO_RECLAMO_LABELS[reclamo.estado]}
                    </Chip>
                  </div>
                  <p className="text-small text-ink-soft">{reclamo.detalle}</p>
                  {reclamo.respuesta ? (
                    <div className="rounded-input bg-surface-muted p-3 text-small text-ink-soft">
                      <span className="font-semibold text-ink">Respuesta: </span>
                      {reclamo.respuesta}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 border-t border-line pt-2.5 text-[12.5px] text-ink-soft">
                      <Icon name="clock" size={15} className="text-ink-muted" />
                      En revisión · te responderemos por correo
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={abierto} onClose={() => setAbierto(false)} width={520}>
        <div className="flex flex-col gap-4 p-6">
          <h2 className="text-h3 font-bold text-ink">Nuevo reclamo</h2>

          {bannerForm && (
            <StateBanner tone="warning" title="No se pudo registrar">
              {bannerForm}
            </StateBanner>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="ql-label">Tipo</span>
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <Segmented
                  value={field.value}
                  onChange={field.onChange}
                  full
                  options={[
                    { value: 'RECLAMO', label: TIPO_RECLAMO_LABELS.RECLAMO },
                    { value: 'QUEJA', label: TIPO_RECLAMO_LABELS.QUEJA },
                  ]}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="ql-label">¿Contra quién?</span>
            <Controller
              control={control}
              name="contra"
              render={({ field }) => (
                <Segmented
                  value={field.value}
                  onChange={field.onChange}
                  full
                  options={[
                    { value: 'COMERCIO', label: DESTINATARIO_RECLAMO_LABELS.COMERCIO },
                    { value: 'PLATAFORMA', label: DESTINATARIO_RECLAMO_LABELS.PLATAFORMA },
                  ]}
                />
              )}
            />
          </div>

          {contra === 'COMERCIO' && (
            <Select
              label="Local"
              placeholder="Elige el local"
              options={(locales.data ?? []).map((l) => ({ value: String(l.id), label: l.nombre }))}
              error={errors.puntoDeVentaId?.message}
              {...register('puntoDeVentaId')}
            />
          )}

          {esCliente && (
            <Select
              label="Pedido relacionado (opcional)"
              placeholder="Ninguno"
              options={(pedidos.data?.content ?? []).map((p) => ({ value: String(p.id), label: p.codigo }))}
              error={errors.pedidoId?.message}
              {...register('pedidoId')}
            />
          )}

          <TextArea
            label="Detalle"
            rows={4}
            placeholder="Describe lo que pasó…"
            error={errors.detalle?.message}
            {...register('detalle')}
          />

          <div className="flex gap-2.5">
            <Button variant="secondary" full onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button full icon="send" loading={crear.loading} onClick={onSubmit}>
              Enviar
            </Button>
          </div>
        </div>
      </Modal>
    </AccountFrame>
  );
}
