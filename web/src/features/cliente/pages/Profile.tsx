import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { http, endpoints } from '@/api';
import { zodResolver } from '@/lib/form';
import { useApi, useAsyncAction, useToast } from '@/hooks';
import { useAuth } from '@/auth';
import { usePageChrome } from '@/components/layout';
import {
  Avatar,
  Button,
  Card,
  ChipMultiSelect,
  Field,
  Segmented,
  Skeleton,
  StateBanner,
  TextArea,
} from '@/components/ui';
import {
  ALERGENO_LABELS,
  PICANTE_LABELS,
  RESTRICCION_LABELS,
  type ActualizarPerfilClienteRequest,
  type Alergeno,
  type PerfilesResponse,
  type RestriccionDietetica,
  type ToleranciaPicante,
} from '@/types';
import { ErrorState } from '../components';
import { perfilSchema, type PerfilValues } from '../schemas';

// Convierte un mapa de etiquetas en opciones { value, label } para los selectores.
function opciones(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const PICANTE_OPCIONES = (Object.keys(PICANTE_LABELS) as ToleranciaPicante[]).map((value) => ({
  value,
  label: PICANTE_LABELS[value],
}));

export default function Profile() {
  const toast = useToast();
  const { user } = useAuth();
  usePageChrome('Perfil de cliente', { maxWidth: 680 });

  const perfil = useApi<PerfilesResponse>((signal) => http.get(endpoints.perfiles.base, { signal }), []);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PerfilValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      direccionPreferida: '',
      alergias: '',
      toleranciaPicante: 'NINGUNA',
      presupuestoReferencia: '',
      alergenosEvitar: [],
      restriccionesDieteticas: [],
    },
  });

  // cuando llega el perfil del backend, cargamos sus valores en el formulario
  useEffect(() => {
    const cliente = perfil.data?.cliente;
    if (!cliente) return;
    reset({
      direccionPreferida: cliente.direccionPreferida ?? '',
      alergias: cliente.alergias ?? '',
      toleranciaPicante: cliente.toleranciaPicante ?? 'NINGUNA',
      presupuestoReferencia: cliente.presupuestoReferencia != null ? String(cliente.presupuestoReferencia) : '',
      alergenosEvitar: cliente.alergenosEvitar,
      restriccionesDieteticas: cliente.restriccionesDieteticas,
    });
  }, [perfil.data, reset]);

  // devolvemos un valor explícito de éxito porque el PUT puede responder sin cuerpo (204)
  const guardar = useAsyncAction(async (body: ActualizarPerfilClienteRequest) => {
    await http.put(endpoints.perfiles.cliente, body);
    return true;
  });

  useEffect(() => {
    const err = guardar.error;
    if (err?.kind === 'validation') {
      for (const [field, message] of Object.entries(err.fieldErrorMap)) {
        setError(field as keyof PerfilValues, { message });
      }
    }
  }, [guardar.error, setError]);

  const onSubmit = handleSubmit(async (values) => {
    const body: ActualizarPerfilClienteRequest = {
      direccionPreferida: values.direccionPreferida || null,
      alergias: values.alergias || null,
      alergenosEvitar: values.alergenosEvitar as Alergeno[],
      restriccionesDieteticas: values.restriccionesDieteticas as RestriccionDietetica[],
      toleranciaPicante: values.toleranciaPicante,
      presupuestoReferencia: values.presupuestoReferencia ? Number(values.presupuestoReferencia) : null,
    };
    const ok = await guardar.run(body);
    if (ok) {
      toast.success('Perfil actualizado.');
      perfil.refetch();
    }
  });

  if (perfil.loading) {
    return (
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-4">
        <Skeleton width={220} height={56} rounded="rounded-card" />
        <Skeleton height={320} rounded="rounded-card" />
      </div>
    );
  }
  if (perfil.error) {
    return <ErrorState error={perfil.error} onRetry={perfil.refetch} title="No pudimos cargar tu perfil" />;
  }

  const cliente = perfil.data?.cliente;
  const banner = guardar.error && guardar.error.kind !== 'validation' ? guardar.error.message : null;

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5">
      <div className="flex items-center gap-3.5">
        <Avatar initials={iniciales(user?.nombreCompleto ?? '')} size={56} />
        <div className="min-w-0">
          <div className="text-h3 font-bold text-ink">{user?.nombreCompleto}</div>
          <div className="truncate text-small text-ink-muted">
            {cliente ? `${cliente.totalPedidos} pedidos · ` : ''}
            {user?.email}
          </div>
        </div>
      </div>

      <StateBanner tone="points" icon="sparkles" title="Esto alimenta al asistente">
        Con tus alergias y preferencias, el asistente solo te recomienda platos seguros y dentro de tu presupuesto.
      </StateBanner>

      {banner && (
        <StateBanner tone="warning" title="No se pudo guardar">
          {banner}
        </StateBanner>
      )}

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="ql-label">Alérgenos a evitar</span>
          <Controller
            control={control}
            name="alergenosEvitar"
            render={({ field }) => (
              <ChipMultiSelect options={opciones(ALERGENO_LABELS)} value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="ql-label">Restricciones dietéticas</span>
          <Controller
            control={control}
            name="restriccionesDieteticas"
            render={({ field }) => (
              <ChipMultiSelect options={opciones(RESTRICCION_LABELS)} value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="ql-label">Tolerancia al picante</span>
          <Controller
            control={control}
            name="toleranciaPicante"
            render={({ field }) => (
              <Segmented value={field.value} onChange={field.onChange} options={PICANTE_OPCIONES} />
            )}
          />
        </div>

        <Field
          label="Presupuesto de referencia"
          type="number"
          prefix="S/"
          step="0.5"
          min="0"
          placeholder="0.00"
          help="El asistente prioriza platos dentro de este monto."
          error={errors.presupuestoReferencia?.message}
          {...register('presupuestoReferencia')}
        />

        <Field
          label="Dirección de entrega preferida"
          placeholder="Ej. Biblioteca, 3er piso"
          error={errors.direccionPreferida?.message}
          {...register('direccionPreferida')}
        />

        <TextArea
          label="Alergias (texto libre)"
          rows={3}
          placeholder="Cuéntanos cualquier alergia o condición…"
          error={errors.alergias?.message}
          {...register('alergias')}
        />

        <Button icon="check" loading={guardar.loading} onClick={onSubmit}>
          Guardar cambios
        </Button>
      </Card>
    </div>
  );
}
