import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { endpoints, http, normalizeError } from '@/api';
import { useAsyncAction, useToast } from '@/hooks';
import { Button, Card, EmptyState, Field, Skeleton } from '@/components/ui';
import { usePageChrome } from '@/components/layout';
import { paths } from '@/routes/paths';
import type {
  ActualizarPuntoDeVentaRequest,
  CrearPuntoDeVentaRequest,
  PuntoDeVentaResponse,
} from '@/types';
import { applyFieldErrors, zodResolver } from '@/lib/form';
import { storeSchema, type StoreFormValues } from '../schemas/store';

// Bloque del formulario: un titulo de seccion y debajo sus campos. Mantiene la forma legible
// y ordena lo obligatorio primero.
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="ql-section-label text-ink-soft">{title}</div>
      {children}
    </div>
  );
}

// Alta y edicion de un local. En edicion intenta usar el local que llega por el estado de
// navegacion y, si no, lo pide al backend. La validacion es con zod antes de enviar.
export default function StoreForm() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  usePageChrome(editing ? 'Editar local' : 'Nuevo local', { maxWidth: 640 });
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const precargado = (location.state as { local?: PuntoDeVentaResponse } | null)?.local ?? null;

  const [loadingDetail, setLoadingDetail] = useState(editing && !precargado);
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      nombre: '',
      ubicacion: '',
      horarioApertura: '08:00',
      horarioCierre: '20:00',
      tiempoPromedioDeclarado: 15,
    },
  });
  const { register, handleSubmit, reset, setError, formState } = form;
  const { errors } = formState;

  useEffect(() => {
    if (!editing) return;
    let cancelado = false;

    async function cargar() {
      try {
        const local =
          precargado ?? (await http.get<PuntoDeVentaResponse>(endpoints.comercio.puntosDeVenta.detail(id!)));
        if (cancelado) return;
        reset({
          nombre: local.nombre,
          ubicacion: local.ubicacion,
          horarioApertura: (local.horarioApertura ?? '').slice(0, 5),
          horarioCierre: (local.horarioCierre ?? '').slice(0, 5),
          tiempoPromedioDeclarado: local.tiempoEsperaEstimado,
        });
      } catch (err) {
        if (!cancelado) setLoadError(normalizeError(err).message);
      } finally {
        if (!cancelado) setLoadingDetail(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, id]);

  const save = useAsyncAction(async (values: StoreFormValues) => {
    const body: CrearPuntoDeVentaRequest = {
      nombre: values.nombre,
      ubicacion: values.ubicacion,
      horarioApertura: values.horarioApertura,
      horarioCierre: values.horarioCierre,
      tiempoPromedioDeclarado: values.tiempoPromedioDeclarado,
    };
    if (editing) {
      await http.put(endpoints.comercio.puntosDeVenta.detail(id!), body as ActualizarPuntoDeVentaRequest);
      toast.success('Local actualizado');
    } else {
      await http.post(endpoints.comercio.puntosDeVenta.base, body);
      toast.success('Local creado');
    }
    navigate(paths.comercio.locales);
  });

  useEffect(() => {
    if (!save.error) return;
    if (save.error.kind === 'validation') applyFieldErrors(setError, save.error.fieldErrorMap);
    else toast.error(save.error.message);
  }, [save.error, setError, toast]);

  // react-hook-form ya valido con el resolver, asi que onSubmit recibe los valores coercidos
  const onSubmit = handleSubmit((values) => {
    save.run(values);
  });

  const volver = (
    <Button variant="ghost" size="sm" icon="arrowLeft" onClick={() => navigate(paths.comercio.locales)}>
      Volver a locales
    </Button>
  );

  if (loadingDetail) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <Skeleton height={280} rounded="rounded-card" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <EmptyState icon="store" title="No pudimos cargar el local" description={loadError} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {volver}

      <Card pad="lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          <Block title="Datos del local">
            <Field label="Nombre" placeholder="Ej. Cafetería Central" error={errors.nombre?.message} {...register('nombre')} />
            <Field
              label="Ubicación"
              placeholder="Ej. Pabellón A, primer piso"
              error={errors.ubicacion?.message}
              {...register('ubicacion')}
            />
          </Block>

          <Block title="Horario y atención">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Apertura" type="time" error={errors.horarioApertura?.message} {...register('horarioApertura')} />
              <Field label="Cierre" type="time" error={errors.horarioCierre?.message} {...register('horarioCierre')} />
            </div>
            <Field
              label="Tiempo promedio declarado"
              type="number"
              min={1}
              step={1}
              hint="minutos"
              help="Tiempo de espera típico que verán los clientes."
              error={errors.tiempoPromedioDeclarado?.message}
              {...register('tiempoPromedioDeclarado')}
            />
          </Block>

          <div className="flex gap-2.5">
            <Button type="button" variant="secondary" full onClick={() => navigate(paths.comercio.locales)}>
              Cancelar
            </Button>
            <Button type="submit" full loading={save.loading}>
              {editing ? 'Guardar cambios' : 'Crear local'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
