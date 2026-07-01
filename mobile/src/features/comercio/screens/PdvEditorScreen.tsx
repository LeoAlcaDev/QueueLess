import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ApiError, api, endpoints, normalizeError, unwrap } from '@/api';
import type { ApiResponse, PuntoDeVentaRequest, PuntoDeVentaResponse } from '@/api/types';
import { Button, Field, Screen, Select, Text } from '@/components';
import { useToast } from '@/hooks';
import { ComercioHeader } from '../components';
import { normalizeTime, timeOptionsWith } from '../util';

export function PdvEditorScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { puntoDeVentaId } = route.params as { puntoDeVentaId?: number };
  const toast = useToast();
  const esEdicion = puntoDeVentaId != null;

  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [apertura, setApertura] = useState<string | null>(null);
  const [cierre, setCierre] = useState<string | null>(null);
  const [tiempo, setTiempo] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);

  const cargar = useCallback(async () => {
    if (puntoDeVentaId == null) return;
    setCargando(true);
    try {
      const local = unwrap(
        await api.get<ApiResponse<PuntoDeVentaResponse>>(endpoints.comercio.pdvById(puntoDeVentaId)),
      );
      setNombre(local.nombre);
      setUbicacion(local.ubicacion);
      setApertura(normalizeTime(local.horarioApertura));
      setCierre(normalizeTime(local.horarioCierre));
      // el backend expone el tiempo estimado; lo usamos como punto de partida del declarado
      setTiempo(local.tiempoEsperaEstimado != null ? String(local.tiempoEsperaEstimado) : '');
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
      toast.error(apiError.message);
    } finally {
      setCargando(false);
    }
  }, [puntoDeVentaId, toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function validar(): boolean {
    const next: Record<string, string> = {};
    if (nombre.trim().length === 0) next.nombre = 'Ponle un nombre al local';
    if (ubicacion.trim().length === 0) next.ubicacion = 'Indica la ubicación';
    if (!apertura) next.horarioApertura = 'Elige la hora de apertura';
    if (!cierre) next.horarioCierre = 'Elige la hora de cierre';
    const minutos = Number(tiempo);
    if (!tiempo.trim() || Number.isNaN(minutos) || minutos <= 0) next.tiempoPromedioDeclarado = 'Ingresa un número de minutos positivo';
    setErrores(next);
    return Object.keys(next).length === 0;
  }

  async function guardar() {
    if (!validar()) return;
    setGuardando(true);
    setErrores({});
    const body: PuntoDeVentaRequest = {
      nombre: nombre.trim(),
      ubicacion: ubicacion.trim(),
      horarioApertura: apertura as string,
      horarioCierre: cierre as string,
      tiempoPromedioDeclarado: Number(tiempo),
    };
    try {
      if (puntoDeVentaId != null) {
        await api.put(endpoints.comercio.pdvById(puntoDeVentaId), body);
      } else {
        await api.post(endpoints.comercio.pdv(), body);
      }
      toast.success('Local guardado');
      navigation.goBack();
    } catch (err) {
      const apiError = err instanceof ApiError ? err : normalizeError(err);
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

  return (
    <Screen
      scroll
      header={<ComercioHeader title={esEdicion ? 'Editar local' : 'Nuevo local'} onBack={() => navigation.goBack()} />}
      footer={<Button title="Guardar local" onPress={guardar} loading={guardando} disabled={cargando} fullWidth />}
    >
      <View style={s.form}>
        <Field label="Nombre del local" value={nombre} onChangeText={setNombre} helperText="Máx. 120 caracteres" error={errores.nombre} />
        <Field label="Ubicación" value={ubicacion} onChangeText={setUbicacion} helperText="Máx. 200 caracteres" error={errores.ubicacion} />
        <View style={s.pair}>
          <View style={s.pairItem}>
            <Select label="Apertura" value={apertura} onChange={setApertura} options={timeOptionsWith(apertura)} error={errores.horarioApertura} />
          </View>
          <View style={s.pairItem}>
            <Select label="Cierre" value={cierre} onChange={setCierre} options={timeOptionsWith(cierre)} error={errores.horarioCierre} />
          </View>
        </View>
        <Field
          label="Tiempo promedio declarado"
          value={tiempo}
          onChangeText={setTiempo}
          keyboardType="number-pad"
          helperText="En minutos. Debe ser positivo."
          error={errores.tiempoPromedioDeclarado}
        />
        <Text variant="small" color="textMuted">
          Este tiempo se muestra a los clientes como espera estimada del local.
        </Text>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    form: { gap: t.spacing[4] },
    pair: { flexDirection: 'row', gap: t.spacing[3] },
    pairItem: { flex: 1 },
  });
}
