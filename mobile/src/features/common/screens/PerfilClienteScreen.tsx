import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import {
  Button,
  ChipMultiSelect,
  Field,
  MetricCard,
  Screen,
  Select,
  Skeleton,
  StateBanner,
  Text,
  TextArea,
} from '@/components/ui';
import { ScreenHeader } from '@/features/common/components';
import { useApi, useToast } from '@/hooks';
import { api, ApiError, endpoints, unwrap } from '@/api';
import type {
  ActualizarPerfilClienteRequest,
  Alergeno,
  ApiResponse,
  PerfilesResponse,
  RestriccionDietetica,
  ToleranciaPicante,
} from '@/api/types';
import { ALERGENO_LABELS, PICANTE_LABELS, RESTRICCION_LABELS } from '@/lib';

const ALERGENO_OPCIONES = Object.entries(ALERGENO_LABELS).map(([value, label]) => ({ value, label }));
const RESTRICCION_OPCIONES = Object.entries(RESTRICCION_LABELS).map(([value, label]) => ({ value, label }));
const PICANTE_OPCIONES = Object.entries(PICANTE_LABELS).map(([value, label]) => ({ value, label }));

// Perfil del cliente: preferencias que alimentan al asistente y al armado del
// pedido (dirección de recojo, alergias, alérgenos a evitar, restricciones, picante
// y presupuesto). El total de pedidos es de solo lectura.
export function PerfilClienteScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();

  const cargar = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<PerfilesResponse>>(endpoints.perfiles.get(), { signal }).then(unwrap),
    [],
  );
  const { data, loading, error, run } = useApi(cargar);
  const cliente = data?.cliente ?? null;

  const [direccion, setDireccion] = useState('');
  const [alergias, setAlergias] = useState('');
  const [alergenos, setAlergenos] = useState<Alergeno[]>([]);
  const [restricciones, setRestricciones] = useState<RestriccionDietetica[]>([]);
  const [picante, setPicante] = useState<ToleranciaPicante | null>(null);
  const [presupuesto, setPresupuesto] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  useEffect(() => {
    if (!cliente) return;
    setDireccion(cliente.direccionPreferida ?? '');
    setAlergias(cliente.alergias ?? '');
    setAlergenos(cliente.alergenosEvitar);
    setRestricciones(cliente.restriccionesDieteticas);
    setPicante(cliente.toleranciaPicante);
    setPresupuesto(cliente.presupuestoReferencia != null ? String(cliente.presupuestoReferencia) : '');
  }, [cliente]);

  async function guardar() {
    setGuardando(true);
    try {
      const body: ActualizarPerfilClienteRequest = {
        direccionPreferida: direccion.trim() || undefined,
        alergias: alergias.trim() || undefined,
        alergenosEvitar: alergenos,
        restriccionesDieteticas: restricciones,
        toleranciaPicante: picante ?? undefined,
        presupuestoReferencia: presupuesto.trim() ? Number(presupuesto) : undefined,
      };
      await api.put(endpoints.perfiles.cliente(), body);
      toast.success('Guardamos tus preferencias.');
      await run();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No pudimos guardar tus preferencias.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Screen
      scroll
      padded
      header={
        <ScreenHeader
          title="Perfil de cliente"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
      }
      footer={cliente ? <Button title="Guardar cambios" onPress={guardar} loading={guardando} fullWidth /> : undefined}
    >
      {loading && !data ? (
        <View style={s.skeletons}>
          <Skeleton width="100%" height={48} radius={t.radii.input} />
          <Skeleton width="100%" height={88} radius={t.radii.input} />
          <Skeleton width="100%" height={48} radius={t.radii.input} />
        </View>
      ) : error && !data ? (
        <StateBanner
          tone="error"
          title="No pudimos cargar tu perfil"
          message={error.message}
          action={{ label: 'Reintentar', onPress: () => run().catch(() => {}) }}
        />
      ) : !cliente ? (
        <StateBanner
          tone="info"
          title="Sin perfil de cliente"
          message="Activa el rol de cliente para configurar tus preferencias de pedido."
        />
      ) : (
        <View style={s.root}>
          <MetricCard icon="receipt" value={cliente.totalPedidos} label="Pedidos realizados" tone="brand" />

          <Field
            label="Dirección preferida de recojo"
            value={direccion}
            onChangeText={setDireccion}
            placeholder="Patios centrales"
            leftIcon="mapPin"
          />

          <TextArea
            label="Alergias"
            value={alergias}
            onChangeText={setAlergias}
            placeholder="Cuéntanos tus alergias para cuidar tus pedidos."
            numberOfLines={3}
          />

          <View style={s.bloque}>
            <Text variant="label" color="textPrimary">
              Alérgenos a evitar
            </Text>
            <ChipMultiSelect
              options={ALERGENO_OPCIONES}
              values={alergenos}
              onChange={(v) => setAlergenos(v as Alergeno[])}
            />
          </View>

          <View style={s.bloque}>
            <Text variant="label" color="textPrimary">
              Restricciones dietéticas
            </Text>
            <ChipMultiSelect
              options={RESTRICCION_OPCIONES}
              values={restricciones}
              onChange={(v) => setRestricciones(v as RestriccionDietetica[])}
            />
          </View>

          <Select
            label="Tolerancia al picante"
            options={PICANTE_OPCIONES}
            value={picante}
            onChange={(v) => setPicante(v as ToleranciaPicante)}
            placeholder="Elige tu nivel"
          />

          <Field
            label="Presupuesto de referencia"
            value={presupuesto}
            onChangeText={setPresupuesto}
            placeholder="18.00"
            keyboardType="decimal-pad"
            prefix="S/"
            helperText="Lo usamos para sugerirte platos dentro de tu presupuesto."
          />
        </View>
      )}
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[4] },
    skeletons: { gap: t.spacing[3] },
    bloque: { gap: t.spacing[2] },
  });
}
