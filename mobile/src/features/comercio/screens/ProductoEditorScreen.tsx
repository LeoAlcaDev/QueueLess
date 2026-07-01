import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ApiError, api, endpoints, normalizeError, unwrap } from '@/api';
import type {
  Alergeno,
  ApiResponse,
  AptitudDietetica,
  CrearProductoRequest,
  ProductoRequestBase,
  ProductoResponse,
  TipoPreparacion,
  ToleranciaPicante,
} from '@/api/types';
import { ALERGENO_LABELS, APTITUD_LABELS, PICANTE_LABELS, PREPARACION_LABELS } from '@/lib';
import {
  Button,
  Card,
  ChipMultiSelect,
  Field,
  ProductPhotoField,
  Screen,
  Segmented,
  Select,
  Text,
  TextArea,
  Toggle,
} from '@/components';
import { useToast } from '@/hooks';
import { ComercioHeader } from '../components';
import { normalizeTime, timeOptionsWith, uploadProductoFoto } from '../util';

const ALERGENO_OPCIONES = (Object.keys(ALERGENO_LABELS) as Alergeno[]).map((value) => ({ value, label: ALERGENO_LABELS[value] }));
const APTITUD_OPCIONES = (Object.keys(APTITUD_LABELS) as AptitudDietetica[]).map((value) => ({ value, label: APTITUD_LABELS[value] }));
const PICANTE_OPCIONES = (Object.keys(PICANTE_LABELS) as ToleranciaPicante[]).map((value) => ({ value, label: PICANTE_LABELS[value] }));
const PREP_OPCIONES: { value: TipoPreparacion; label: string }[] = [
  { value: 'PREPARADO', label: PREPARACION_LABELS.PREPARADO },
  { value: 'INSTANTANEO', label: PREPARACION_LABELS.INSTANTANEO },
];

interface PhotoAsset {
  uri: string;
  name: string;
  mimeType: string;
}

export function ProductoEditorScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { puntoDeVentaId, productoId } = route.params as { puntoDeVentaId: number; productoId?: number };
  const toast = useToast();
  const esEdicion = productoId != null;

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tipoPreparacion, setTipoPreparacion] = useState<TipoPreparacion>('PREPARADO');
  const [nivelPicante, setNivelPicante] = useState<ToleranciaPicante>('NINGUNA');
  const [alergenos, setAlergenos] = useState<Alergeno[]>([]);
  const [aptitudes, setAptitudes] = useState<AptitudDietetica[]>([]);
  const [servicioInicio, setServicioInicio] = useState<string | null>(null);
  const [servicioFin, setServicioFin] = useState<string | null>(null);
  const [tieneVentana, setTieneVentana] = useState(false);
  const [pedidoInicio, setPedidoInicio] = useState<string | null>(null);
  const [pedidoFin, setPedidoFin] = useState<string | null>(null);
  const [recojoInicio, setRecojoInicio] = useState<string | null>(null);
  const [recojoFin, setRecojoFin] = useState<string | null>(null);
  const [vigenciaInicio, setVigenciaInicio] = useState('');
  const [vigenciaFin, setVigenciaFin] = useState('');
  const [aceptaProgramado, setAceptaProgramado] = useState(false);

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<PhotoAsset | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);

  // al editar, traemos el producto y rellenamos el formulario
  const cargar = useCallback(async () => {
    if (productoId == null) return;
    setCargando(true);
    try {
      const p = unwrap(await api.get<ApiResponse<ProductoResponse>>(endpoints.comercio.productoById(productoId)));
      setNombre(p.nombre);
      setDescripcion(p.descripcion);
      setPrecio(String(p.precio));
      setCategoria(p.categoria);
      setTipoPreparacion(p.tipoPreparacion);
      setNivelPicante(p.nivelPicante);
      setAlergenos(p.alergenos);
      setAptitudes(p.aptitudesDieteticas);
      setServicioInicio(normalizeTime(p.horarioServicioInicio));
      setServicioFin(normalizeTime(p.horarioServicioFin));
      setTieneVentana(p.tieneVentanaDePedido);
      setPedidoInicio(normalizeTime(p.ventanaPedidoInicio));
      setPedidoFin(normalizeTime(p.ventanaPedidoFin));
      setRecojoInicio(normalizeTime(p.ventanaRecojoInicio));
      setRecojoFin(normalizeTime(p.ventanaRecojoFin));
      setVigenciaInicio(p.vigenciaInicio ?? '');
      setVigenciaFin(p.vigenciaFin ?? '');
      setAceptaProgramado(p.aceptaProgramado);
      setFotoUrl(p.fotoUrl);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      toast.error(apiError.message);
    } finally {
      setCargando(false);
    }
  }, [productoId, toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function onPickFoto(asset: PhotoAsset) {
    setFotoUrl(asset.uri);
    setPendiente(asset);
    // si el producto ya existe, subimos la foto en el momento
    if (productoId != null) {
      setSubiendo(true);
      try {
        await uploadProductoFoto(productoId, asset);
        setPendiente(null);
        toast.success('Foto actualizada');
      } catch (err) {
        const apiError = err instanceof ApiError ? err : normalizeError(err);
        toast.error(apiError.message);
      } finally {
        setSubiendo(false);
      }
    }
  }

  function validar(): boolean {
    const next: Record<string, string> = {};
    if (nombre.trim().length === 0) next.nombre = 'Ponle un nombre al producto';
    if (descripcion.trim().length === 0) next.descripcion = 'Agrega una descripción';
    const precioNum = Number(precio);
    if (!precio.trim() || Number.isNaN(precioNum) || precioNum <= 0) next.precio = 'Ingresa un precio válido';
    if (categoria.trim().length === 0) next.categoria = 'Indica la categoría';
    setErrores(next);
    return Object.keys(next).length === 0;
  }

  async function guardar() {
    if (!validar()) return;
    setGuardando(true);
    setErrores({});
    const conVentana = tipoPreparacion === 'PREPARADO' && tieneVentana;
    const base: ProductoRequestBase = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio: Number(precio),
      categoria: categoria.trim(),
      tipoPreparacion,
      alergenos,
      aptitudesDieteticas: aptitudes,
      nivelPicante,
      horarioServicioInicio: servicioInicio ?? undefined,
      horarioServicioFin: servicioFin ?? undefined,
      tieneVentanaDePedido: conVentana,
      ventanaPedidoInicio: conVentana ? pedidoInicio ?? undefined : undefined,
      ventanaPedidoFin: conVentana ? pedidoFin ?? undefined : undefined,
      ventanaRecojoInicio: conVentana ? recojoInicio ?? undefined : undefined,
      ventanaRecojoFin: conVentana ? recojoFin ?? undefined : undefined,
      vigenciaInicio: conVentana && vigenciaInicio.trim() ? vigenciaInicio.trim() : undefined,
      vigenciaFin: conVentana && vigenciaFin.trim() ? vigenciaFin.trim() : undefined,
      aceptaProgramado,
    };

    try {
      if (productoId != null) {
        await api.put(endpoints.comercio.productoById(productoId), base);
      } else {
        const body: CrearProductoRequest = { ...base, puntoDeVentaId };
        const creado = unwrap(await api.post<ApiResponse<ProductoResponse>>(endpoints.comercio.productos(), body));
        if (pendiente) await uploadProductoFoto(creado.id, pendiente);
      }
      toast.success('Producto guardado');
      navigation.goBack();
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      // 400 con errores por campo → al formulario; el resto a toast
      if (apiError.kind === 'validation' && apiError.fieldErrors) {
        const map: Record<string, string> = {};
        for (const fe of apiError.fieldErrors) map[fe.field] = fe.message;
        setErrores(map);
      } else {
        toast.error(apiError.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  const mostrarVentana = tipoPreparacion === 'PREPARADO';

  return (
    <Screen
      scroll
      header={<ComercioHeader title={esEdicion ? 'Editar producto' : 'Nuevo producto'} onBack={() => navigation.goBack()} />}
      footer={<Button title="Guardar producto" onPress={guardar} loading={guardando} disabled={cargando} fullWidth />}
    >
      <View style={s.form}>
        <Block title="Datos del producto">
          <Field label="Nombre" value={nombre} onChangeText={setNombre} helperText="Máx. 120 caracteres" error={errores.nombre} />
          <TextArea label="Descripción" value={descripcion} onChangeText={setDescripcion} numberOfLines={3} maxLength={500} error={errores.descripcion} />
          <View style={s.pair}>
            <View style={s.pairItem}>
              <Field label="Precio" value={precio} onChangeText={setPrecio} prefix="S/" keyboardType="decimal-pad" error={errores.precio} />
            </View>
            <View style={s.pairItem}>
              <Field label="Categoría" value={categoria} onChangeText={setCategoria} error={errores.categoria} />
            </View>
          </View>
        </Block>

        <Block title="Foto">
          <ProductPhotoField uri={fotoUrl} onPick={onPickFoto} uploading={subiendo} />
          <Text variant="small" color="textMuted">
            JPG, PNG o WEBP · máx. 2 MB
          </Text>
        </Block>

        <Block title="Preparación">
          <View>
            <Text variant="label" style={s.label}>
              Tipo de preparación
            </Text>
            <Segmented
              fullWidth
              value={tipoPreparacion}
              onChange={(value) => setTipoPreparacion(value as TipoPreparacion)}
              options={PREP_OPCIONES}
            />
          </View>
          <View>
            <Text variant="label" style={s.label}>
              Nivel de picante
            </Text>
            <Segmented
              fullWidth
              value={nivelPicante}
              onChange={(value) => setNivelPicante(value as ToleranciaPicante)}
              options={PICANTE_OPCIONES}
            />
          </View>
          <View style={s.pair}>
            <View style={s.pairItem}>
              <HoraSelect label="Servicio desde" value={servicioInicio} onChange={setServicioInicio} />
            </View>
            <View style={s.pairItem}>
              <HoraSelect label="Servicio hasta" value={servicioFin} onChange={setServicioFin} />
            </View>
          </View>
        </Block>

        <Block title="Información dietética">
          <View>
            <Text variant="label" style={s.label}>
              Alérgenos
            </Text>
            <ChipMultiSelect options={ALERGENO_OPCIONES} values={alergenos} onChange={(v) => setAlergenos(v as Alergeno[])} />
          </View>
          <View>
            <Text variant="label" style={s.label}>
              Aptitudes
            </Text>
            <ChipMultiSelect options={APTITUD_OPCIONES} values={aptitudes} onChange={(v) => setAptitudes(v as AptitudDietetica[])} />
          </View>
        </Block>

        {mostrarVentana ? (
          <Card>
            <Toggle
              value={tieneVentana}
              onValueChange={setTieneVentana}
              label="Producto por lote"
              sub="Define ventanas de pedido y recojo + vigencia"
            />
            {tieneVentana ? (
              <View style={s.ventana}>
                <View style={s.pair}>
                  <View style={s.pairItem}>
                    <HoraSelect label="Pedido desde" value={pedidoInicio} onChange={setPedidoInicio} />
                  </View>
                  <View style={s.pairItem}>
                    <HoraSelect label="Pedido hasta" value={pedidoFin} onChange={setPedidoFin} />
                  </View>
                </View>
                <View style={s.pair}>
                  <View style={s.pairItem}>
                    <HoraSelect label="Recojo desde" value={recojoInicio} onChange={setRecojoInicio} />
                  </View>
                  <View style={s.pairItem}>
                    <HoraSelect label="Recojo hasta" value={recojoFin} onChange={setRecojoFin} />
                  </View>
                </View>
                <View style={s.pair}>
                  <View style={s.pairItem}>
                    <Field label="Vigencia inicio" value={vigenciaInicio} onChangeText={setVigenciaInicio} placeholder="AAAA-MM-DD" />
                  </View>
                  <View style={s.pairItem}>
                    <Field label="Vigencia fin" value={vigenciaFin} onChangeText={setVigenciaFin} placeholder="AAAA-MM-DD" />
                  </View>
                </View>
                <Toggle value={aceptaProgramado} onValueChange={setAceptaProgramado} label="Acepta pedidos programados" />
              </View>
            ) : null}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

// selector de hora con opción para no restringir ("Todo el día")
function HoraSelect({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const SIN_LIMITE = '__all__';
  const opciones = [{ label: 'Todo el día', value: SIN_LIMITE }, ...timeOptionsWith(value)];
  return (
    <Select
      label={label}
      value={value ?? SIN_LIMITE}
      onChange={(v) => onChange(v === SIN_LIMITE ? null : v)}
      options={opciones}
    />
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing[3] }}>
      <Text variant="label">{title}</Text>
      {children}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    form: { gap: t.spacing[6] },
    label: { marginBottom: t.spacing[2] },
    pair: { flexDirection: 'row', gap: t.spacing[3] },
    pairItem: { flex: 1 },
    ventana: { gap: t.spacing[3], marginTop: t.spacing[3] },
  });
}
