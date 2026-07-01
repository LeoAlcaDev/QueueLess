import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { http, endpoints } from '@/api';
import { zodResolver } from '@/lib/form';
import { useAsyncAction, useToast } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Button, Segmented, Stars, StateBanner, TextArea } from '@/components/ui';
import { paths } from '@/routes/paths';
import { OBJETIVO_RESENA_LABELS, type CrearResenaRequest, type ResenaResponse } from '@/types';
import { BackLink } from '../components';
import { resenaSchema, type ResenaValues } from '../schemas';

const PALABRA = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'];

export default function Review() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  usePageChrome('Dejar reseña', { maxWidth: 560 });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<ResenaValues>({
    resolver: zodResolver(resenaSchema),
    defaultValues: { objetivoTipo: 'PUNTO_DE_VENTA', calificacion: 0, comentario: '' },
  });

  const calificacion = watch('calificacion');

  const crear = useAsyncAction((body: CrearResenaRequest) =>
    http.post<ResenaResponse>(endpoints.cliente.pedidos.resenas(id), body),
  );

  useEffect(() => {
    const err = crear.error;
    if (err?.kind === 'validation') {
      for (const [field, message] of Object.entries(err.fieldErrorMap)) {
        setError(field as keyof ResenaValues, { message });
      }
    }
  }, [crear.error, setError]);

  const onSubmit = handleSubmit(async (values) => {
    const body: CrearResenaRequest = {
      objetivoTipo: values.objetivoTipo,
      calificacion: values.calificacion,
      comentario: values.comentario || null,
    };
    const res = await crear.run(body);
    if (res) {
      toast.success('¡Gracias por tu reseña!');
      navigate(paths.cliente.pedido(id));
    }
  });

  // 422: el pedido ya fue reseñado o no es elegible; mostramos el mensaje tal cual
  const banner = crear.error && crear.error.kind !== 'validation' ? crear.error.message : null;

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5">
      <BackLink to={paths.cliente.pedido(id)} />

      {banner && (
        <StateBanner tone="warning" title="No pudimos registrar la reseña">
          {banner}
        </StateBanner>
      )}

      <div className="flex flex-col gap-2">
        <span className="ql-section-label">¿Qué quieres reseñar?</span>
        <Controller
          control={control}
          name="objetivoTipo"
          render={({ field }) => (
            <Segmented
              value={field.value}
              onChange={field.onChange}
              full
              options={[
                { value: 'PUNTO_DE_VENTA', label: OBJETIVO_RESENA_LABELS.PUNTO_DE_VENTA },
                { value: 'REPARTIDOR', label: OBJETIVO_RESENA_LABELS.REPARTIDOR },
              ]}
            />
          )}
        />
      </div>

      <div className="flex flex-col items-center gap-2.5 py-2">
        <span className="ql-label">Tu calificación</span>
        <Controller
          control={control}
          name="calificacion"
          render={({ field }) => <Stars value={field.value} size={40} onChange={field.onChange} />}
        />
        <span className="text-small text-ink-muted">{PALABRA[calificacion] ?? ''}</span>
        {errors.calificacion && <span className="text-small text-error-fg">{errors.calificacion.message}</span>}
      </div>

      <TextArea
        label="Comentario (opcional)"
        rows={4}
        placeholder="Cuéntanos cómo estuvo tu pedido…"
        error={errors.comentario?.message}
        {...register('comentario')}
      />

      <Button full icon="send" loading={crear.loading} onClick={onSubmit}>
        Enviar reseña
      </Button>
    </div>
  );
}
