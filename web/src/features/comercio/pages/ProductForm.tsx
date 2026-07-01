import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { endpoints, http, isApiError, normalizeError } from '@/api';
import { useAsyncAction, useToast } from '@/hooks';
import {
  Button,
  Card,
  ChipMultiSelect,
  EmptyState,
  Field,
  Icon,
  Segmented,
  Select,
  Skeleton,
  StateBanner,
  TextArea,
  Toggle,
} from '@/components/ui';
import { usePageChrome } from '@/components/layout';
import { paths } from '@/routes/paths';
import {
  ALERGENO_LABELS,
  APTITUD_LABELS,
  PICANTE_LABELS,
  PREPARACION_LABELS,
  type Alergeno,
  type ActualizarProductoRequest,
  type AptitudDietetica,
  type CrearProductoRequest,
  type ProductoResponse,
  type TipoPreparacion,
  type ToleranciaPicante,
} from '@/types';
import { applyFieldErrors, zodResolver } from '@/lib/form';
import { useStores } from '../hooks';
import { productSchema, type ProductFormValues } from '../schemas/product';

const PREP_OPTIONS = (Object.keys(PREPARACION_LABELS) as TipoPreparacion[]).map((v) => ({
  value: v,
  label: PREPARACION_LABELS[v],
}));
const PICANTE_OPTIONS = (Object.keys(PICANTE_LABELS) as ToleranciaPicante[]).map((v) => ({
  value: v,
  label: PICANTE_LABELS[v],
}));
const ALERGENO_OPTIONS = (Object.keys(ALERGENO_LABELS) as Alergeno[]).map((v) => ({
  value: v,
  label: ALERGENO_LABELS[v],
}));
const APTITUD_OPTIONS = (Object.keys(APTITUD_LABELS) as AptitudDietetica[]).map((v) => ({
  value: v,
  label: APTITUD_LABELS[v],
}));

const MAX_FOTO = 2 * 1024 * 1024;
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

// '' -> null, para los campos opcionales que el backend prefiere ausentes
function opt(valor: string | undefined): string | null {
  return valor && valor.trim() ? valor.trim() : null;
}

// Bloque del formulario: un titulo de seccion y sus campos. Ordena la carga por temas para
// que se entienda sin documentacion: primero lo obligatorio, luego foto, reglas y vigencia.
function Block({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <div className="ql-section-label text-ink-soft">{title}</div>
        {sub && <p className="mt-1 text-[12.5px] text-ink-muted">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// Alta y edicion de producto. Forma larga ordenada por bloques: datos obligatorios, foto,
// preparacion, informacion dietetica y disponibilidad. La foto se sube aparte, una vez que el
// producto existe (multipart). En edicion no se cambia el local.
export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  usePageChrome(editing ? 'Editar producto' : 'Nuevo producto', { maxWidth: 720 });
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const stores = useStores();
  const [loadingDetail, setLoadingDetail] = useState(editing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [existingFoto, setExistingFoto] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      puntoDeVentaId: undefined,
      nombre: '',
      descripcion: '',
      precio: undefined,
      categoria: '',
      tipoPreparacion: 'PREPARADO',
      alergenos: [],
      aptitudesDieteticas: [],
      nivelPicante: 'NINGUNA',
      aceptaProgramado: false,
      tieneVentanaDePedido: false,
      horarioServicioInicio: '',
      horarioServicioFin: '',
      ventanaPedidoInicio: '',
      ventanaPedidoFin: '',
      ventanaRecojoInicio: '',
      ventanaRecojoFin: '',
      vigenciaInicio: '',
      vigenciaFin: '',
    },
  });
  const { register, handleSubmit, control, reset, setValue, setError, watch, formState } = form;
  const { errors } = formState;

  // en creacion, preseleccionar el local que venga del listado o el primero disponible
  useEffect(() => {
    if (editing || !stores.data || stores.data.length === 0) return;
    const preset = (location.state as { puntoDeVentaId?: number } | null)?.puntoDeVentaId;
    setValue('puntoDeVentaId', preset ?? stores.data[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores.data, editing]);

  // en edicion, cargar el producto (del estado de navegacion o del backend) al formulario
  useEffect(() => {
    if (!editing) return;
    let cancelado = false;

    async function cargar() {
      try {
        const producto =
          (location.state as { producto?: ProductoResponse } | null)?.producto ??
          (await http.get<ProductoResponse>(endpoints.comercio.productos.detail(id!)));
        if (cancelado) return;
        setExistingFoto(producto.fotoUrl);
        reset({
          // el local no se edita; este valor solo satisface la validación y no se envía
          puntoDeVentaId: 1,
          nombre: producto.nombre,
          descripcion: producto.descripcion ?? '',
          precio: producto.precio,
          categoria: producto.categoria ?? '',
          tipoPreparacion: producto.tipoPreparacion,
          alergenos: producto.alergenos,
          aptitudesDieteticas: producto.aptitudesDieteticas,
          nivelPicante: producto.nivelPicante ?? 'NINGUNA',
          aceptaProgramado: producto.aceptaProgramado,
          tieneVentanaDePedido: producto.tieneVentanaDePedido,
          horarioServicioInicio: (producto.horarioServicioInicio ?? '').slice(0, 5),
          horarioServicioFin: (producto.horarioServicioFin ?? '').slice(0, 5),
          ventanaPedidoInicio: (producto.ventanaPedidoInicio ?? '').slice(0, 5),
          ventanaPedidoFin: (producto.ventanaPedidoFin ?? '').slice(0, 5),
          ventanaRecojoInicio: (producto.ventanaRecojoInicio ?? '').slice(0, 5),
          ventanaRecojoFin: (producto.ventanaRecojoFin ?? '').slice(0, 5),
          vigenciaInicio: producto.vigenciaInicio ?? '',
          vigenciaFin: producto.vigenciaFin ?? '',
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

  const save = useAsyncAction(
    async (payload: { request: CrearProductoRequest | ActualizarProductoRequest; foto: File | null }) => {
      let producto: ProductoResponse;
      if (editing) {
        producto = await http.put<ProductoResponse>(endpoints.comercio.productos.detail(id!), payload.request);
      } else {
        producto = await http.post<ProductoResponse>(endpoints.comercio.productos.base, payload.request);
      }
      // la foto va en una llamada multipart aparte; si falla no tumbamos el guardado
      if (payload.foto) {
        try {
          const fd = new FormData();
          fd.append('file', payload.foto);
          await http.postForm(endpoints.comercio.productos.foto(producto.id), fd);
        } catch (err) {
          toast.error(isApiError(err) ? err.message : 'No se pudo subir la foto');
        }
      }
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      navigate(paths.comercio.productos);
    },
  );

  useEffect(() => {
    if (!save.error) return;
    if (save.error.kind === 'validation') applyFieldErrors(setError, save.error.fieldErrorMap);
    else toast.error(save.error.message);
  }, [save.error, setError, toast]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0] ?? null;
    if (!elegido) {
      setFile(null);
      setFileError('');
      return;
    }
    if (!TIPOS_FOTO.includes(elegido.type)) {
      setFileError('Formato no válido. Usa jpg, png o webp.');
      setFile(null);
      return;
    }
    if (elegido.size > MAX_FOTO) {
      setFileError('La imagen supera los 2MB.');
      setFile(null);
      return;
    }
    setFileError('');
    setFile(elegido);
  };

  // react-hook-form ya valido con el resolver; v trae los valores coercidos (precio y local)
  const onSubmit = handleSubmit((v) => {
    if (fileError) return;
    const full: CrearProductoRequest = {
      puntoDeVentaId: v.puntoDeVentaId,
      nombre: v.nombre,
      descripcion: opt(v.descripcion),
      precio: v.precio,
      categoria: opt(v.categoria),
      tipoPreparacion: v.tipoPreparacion,
      alergenos: v.alergenos,
      aptitudesDieteticas: v.aptitudesDieteticas,
      nivelPicante: v.nivelPicante,
      horarioServicioInicio: opt(v.horarioServicioInicio),
      horarioServicioFin: opt(v.horarioServicioFin),
      tieneVentanaDePedido: v.tieneVentanaDePedido,
      ventanaPedidoInicio: opt(v.ventanaPedidoInicio),
      ventanaPedidoFin: opt(v.ventanaPedidoFin),
      ventanaRecojoInicio: opt(v.ventanaRecojoInicio),
      ventanaRecojoFin: opt(v.ventanaRecojoFin),
      vigenciaInicio: opt(v.vigenciaInicio),
      vigenciaFin: opt(v.vigenciaFin),
      aceptaProgramado: v.aceptaProgramado,
    };
    if (editing) {
      // en edición el local no se cambia: enviamos el resto del producto sin puntoDeVentaId
      const actualizar: ActualizarProductoRequest = {
        nombre: full.nombre,
        descripcion: full.descripcion,
        precio: full.precio,
        categoria: full.categoria,
        tipoPreparacion: full.tipoPreparacion,
        alergenos: full.alergenos,
        aptitudesDieteticas: full.aptitudesDieteticas,
        nivelPicante: full.nivelPicante,
        horarioServicioInicio: full.horarioServicioInicio,
        horarioServicioFin: full.horarioServicioFin,
        tieneVentanaDePedido: full.tieneVentanaDePedido,
        ventanaPedidoInicio: full.ventanaPedidoInicio,
        ventanaPedidoFin: full.ventanaPedidoFin,
        ventanaRecojoInicio: full.ventanaRecojoInicio,
        ventanaRecojoFin: full.ventanaRecojoFin,
        vigenciaInicio: full.vigenciaInicio,
        vigenciaFin: full.vigenciaFin,
        aceptaProgramado: full.aceptaProgramado,
      };
      save.run({ request: actualizar, foto: file });
    } else {
      save.run({ request: full, foto: file });
    }
  });

  const storeOptions = useMemo(
    () => (stores.data ?? []).map((s) => ({ value: String(s.id), label: s.nombre })),
    [stores.data],
  );
  const usaVentana = watch('tieneVentanaDePedido');
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : existingFoto), [file, existingFoto]);

  const volver = (
    <Button variant="ghost" size="sm" icon="arrowLeft" onClick={() => navigate(paths.comercio.productos)}>
      Volver a productos
    </Button>
  );

  if (loadingDetail) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <Skeleton height={360} rounded="rounded-card" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <EmptyState icon="bag" title="No pudimos cargar el producto" description={loadError} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {volver}

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Card pad="lg">
          <Block title="Datos del producto">
            {!editing && (
              <Select
                label="Local"
                placeholder="Selecciona un local"
                options={storeOptions}
                error={errors.puntoDeVentaId?.message}
                {...register('puntoDeVentaId')}
              />
            )}
            <Field label="Nombre" placeholder="Ej. Lomo saltado" error={errors.nombre?.message} {...register('nombre')} />
            <TextArea
              label="Descripción"
              placeholder="Ingredientes, porción, etc."
              error={errors.descripcion?.message}
              {...register('descripcion')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Precio"
                type="number"
                step="0.01"
                min={0}
                prefix="S/"
                error={errors.precio?.message}
                {...register('precio')}
              />
              <Field label="Categoría" placeholder="Ej. Platos de fondo" error={errors.categoria?.message} {...register('categoria')} />
            </div>
          </Block>
        </Card>

        <Card pad="lg">
          <Block title="Foto" sub="JPG, PNG o WEBP · máximo 2 MB">
            <div className="flex items-center gap-4 rounded-input border border-line bg-surface-muted p-3.5">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-input bg-surface text-ink-muted">
                {previewUrl ? (
                  <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="image" size={24} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onFile}
                  className="block w-full text-small text-ink-soft file:mr-3 file:cursor-pointer file:rounded-button file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-small file:font-semibold file:text-brand-text"
                />
                <p className="mt-1.5 text-[12px] text-ink-muted">
                  {file ? file.name : 'Elige una imagen del producto para que destaque en la carta.'}
                </p>
              </div>
            </div>
            {fileError && (
              <StateBanner tone="error" title="No pudimos cargar la foto">
                {fileError}
              </StateBanner>
            )}
          </Block>
        </Card>

        <Card pad="lg">
          <Block title="Preparación">
            <div className="flex flex-col gap-1.5">
              <span className="ql-label">Tipo de preparación</span>
              <Controller
                control={control}
                name="tipoPreparacion"
                render={({ field }) => (
                  <Segmented value={field.value} onChange={field.onChange} options={PREP_OPTIONS} full />
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="ql-label">Nivel de picante</span>
              <Controller
                control={control}
                name="nivelPicante"
                render={({ field }) => (
                  <Segmented value={field.value} onChange={field.onChange} options={PICANTE_OPTIONS} full />
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Servicio desde" type="time" {...register('horarioServicioInicio')} />
              <Field label="Servicio hasta" type="time" {...register('horarioServicioFin')} />
            </div>
          </Block>
        </Card>

        <Card pad="lg">
          <Block title="Información dietética">
            <div className="flex flex-col gap-2">
              <span className="ql-label">Alérgenos</span>
              <Controller
                control={control}
                name="alergenos"
                render={({ field }) => (
                  <ChipMultiSelect options={ALERGENO_OPTIONS} value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="ql-label">Aptitudes dietéticas</span>
              <Controller
                control={control}
                name="aptitudesDieteticas"
                render={({ field }) => (
                  <ChipMultiSelect options={APTITUD_OPTIONS} value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
          </Block>
        </Card>

        <Card pad="lg">
          <Block title="Disponibilidad" sub="Cuándo se puede pedir y recoger este producto.">
            <Controller
              control={control}
              name="aceptaProgramado"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Acepta pedidos programados"
                  sub="Los clientes pueden reservar para más tarde."
                />
              )}
            />
            <Controller
              control={control}
              name="tieneVentanaDePedido"
              render={({ field }) => (
                <Toggle
                  checked={field.value}
                  onChange={field.onChange}
                  label="Tiene ventana de pedido"
                  sub="Limita las horas en que se puede pedir y recoger."
                />
              )}
            />

            {usaVentana && (
              <div className="flex flex-col gap-3.5 border-t border-line pt-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pedido desde" type="time" {...register('ventanaPedidoInicio')} />
                  <Field label="Pedido hasta" type="time" {...register('ventanaPedidoFin')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Recojo desde" type="time" {...register('ventanaRecojoInicio')} />
                  <Field label="Recojo hasta" type="time" {...register('ventanaRecojoFin')} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vigencia desde" type="date" {...register('vigenciaInicio')} />
              <Field label="Vigencia hasta" type="date" {...register('vigenciaFin')} />
            </div>
          </Block>
        </Card>

        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" full onClick={() => navigate(paths.comercio.productos)}>
            Cancelar
          </Button>
          <Button type="submit" full loading={save.loading}>
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
