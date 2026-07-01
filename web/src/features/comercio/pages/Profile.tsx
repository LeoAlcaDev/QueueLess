import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { endpoints, http } from '@/api';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { Button, Card, Chip, EmptyState, Field, Icon, Skeleton } from '@/components/ui';
import { usePageChrome } from '@/components/layout';
import type { ActualizarPerfilComercioRequest, PerfilesResponse } from '@/types';
import { applyFieldErrors, zodResolver } from '@/lib/form';
import { profileSchema, type ProfileFormValues } from '../schemas/profile';

// Perfil del comercio: datos fiscales y de contacto. El RUC es obligatorio (11 dígitos que
// empiezan en 10 o 20). La tasa de cumplimiento es de solo lectura, la calcula el backend.
export default function Profile() {
  usePageChrome('Perfil de comercio', { sub: 'Datos fiscales y de contacto', maxWidth: 640 });
  const toast = useToast();
  const { data, loading, error, refetch } = useApi<PerfilesResponse>(
    (signal) => http.get(endpoints.perfiles.base, { signal }),
    [],
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { ruc: '', contactoTelefono: '', contactoEmail: '' },
  });
  const { register, handleSubmit, reset, setError, formState } = form;
  const { errors } = formState;

  const comercio = data?.comercio ?? null;

  useEffect(() => {
    if (!comercio) return;
    reset({
      ruc: comercio.ruc ?? '',
      contactoTelefono: comercio.contactoTelefono ?? '',
      contactoEmail: comercio.contactoEmail ?? '',
    });
  }, [comercio, reset]);

  const save = useAsyncAction(async (values: ProfileFormValues) => {
    const body: ActualizarPerfilComercioRequest = {
      ruc: values.ruc,
      contactoTelefono: values.contactoTelefono?.trim() ? values.contactoTelefono.trim() : null,
      contactoEmail: values.contactoEmail?.trim() ? values.contactoEmail.trim() : null,
    };
    await http.put(endpoints.perfiles.comercio, body);
    toast.success('Perfil actualizado');
    refetch();
  });

  useEffect(() => {
    if (!save.error) return;
    if (save.error.kind === 'validation') applyFieldErrors(setError, save.error.fieldErrorMap);
    else toast.error(save.error.message);
  }, [save.error, setError, toast]);

  // react-hook-form ya valido con el resolver, asi que onSubmit recibe los valores listos
  const onSubmit = handleSubmit((values) => {
    save.run(values);
  });

  if (loading && !data) {
    return <Skeleton height={360} rounded="rounded-card" />;
  }

  if (error) {
    return (
      <EmptyState
        icon="userRound"
        title="No pudimos cargar tu perfil"
        description={error.message}
        action={
          <Button icon="refresh" onClick={refetch}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const tasa = comercio?.tasaCumplimiento;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3.5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-card bg-brand-soft text-brand-text">
          <Icon name="store" size={26} />
        </span>
        <div className="min-w-0">
          <div className="text-h3 font-bold text-ink">Mi comercio</div>
          <div className="text-small text-ink-muted">Comercio · UTEC</div>
        </div>
      </div>

      {typeof tasa === 'number' && (
        <Card pad="md" className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold text-ink-soft">Tasa de cumplimiento</div>
            <div className="text-h2 font-bold tabular-nums text-accent-text">{Math.round(tasa * 100)}%</div>
          </div>
          <Chip tone="success" icon="checkCircle">
            Solo lectura
          </Chip>
        </Card>
      )}

      <Card pad="lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            label="RUC"
            placeholder="20123456789"
            inputMode="numeric"
            maxLength={11}
            help="11 dígitos, empieza con 10 o 20."
            error={errors.ruc?.message}
            {...register('ruc')}
          />
          <Field
            label="Teléfono de contacto"
            type="tel"
            placeholder="999 888 777"
            error={errors.contactoTelefono?.message}
            {...register('contactoTelefono')}
          />
          <Field
            label="Correo de contacto"
            type="email"
            placeholder="contacto@tucomercio.pe"
            error={errors.contactoEmail?.message}
            {...register('contactoEmail')}
          />
          <div className="mt-2">
            <Button type="submit" full loading={save.loading}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
