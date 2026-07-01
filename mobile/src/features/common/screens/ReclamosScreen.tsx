import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import {
  Button,
  Card,
  EmptyState,
  Screen,
  Segmented,
  Select,
  Skeleton,
  StateBanner,
  StatusBadge,
  Text,
  TextArea,
} from '@/components/ui';
import { ScreenHeader } from '@/features/common/components';
import { useApi, useToast } from '@/hooks';
import { api, ApiError, endpoints, unwrap, unwrapList } from '@/api';
import type {
  AcuseReclamoResponse,
  ApiResponse,
  CrearReclamoRequest,
  DestinatarioReclamo,
  EstadoReclamo,
  ReclamoResponse,
  TipoReclamo,
} from '@/api/types';
import {
  DESTINATARIO_LABELS,
  ESTADO_RECLAMO_LABELS,
  formatDateTime,
  type StatusTone,
  TIPO_RECLAMO_LABELS,
} from '@/lib';

const TIPO_OPCIONES = [
  { label: TIPO_RECLAMO_LABELS.RECLAMO, value: 'RECLAMO' },
  { label: TIPO_RECLAMO_LABELS.QUEJA, value: 'QUEJA' },
];
const CONTRA_OPCIONES = Object.entries(DESTINATARIO_LABELS).map(([value, label]) => ({ value, label }));

const RECLAMO_TONE: Record<EstadoReclamo, StatusTone> = {
  PENDIENTE: 'warning',
  RESPONDIDO: 'success',
};

// Libro de reclamaciones. Hoy las respuestas llegan por correo (fuera de la app),
// así que lo dejamos claro arriba; abajo conservamos el flujo in-app de registrar
// un reclamo o queja y ver su constancia y estado.
export function ReclamosScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();

  const cargarMios = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<ReclamoResponse[]>>(endpoints.reclamos.mios(), { signal }).then(unwrapList),
    [],
  );
  const { data: mios, loading, error, run } = useApi(cargarMios);

  const [tipo, setTipo] = useState<TipoReclamo>('RECLAMO');
  const [contra, setContra] = useState<DestinatarioReclamo | null>(null);
  const [detalle, setDetalle] = useState('');
  const [detalleError, setDetalleError] = useState<string | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);
  const [acuse, setAcuse] = useState<AcuseReclamoResponse | null>(null);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  async function enviar() {
    setDetalleError(undefined);
    if (!contra) {
      toast.error('Elige contra quién es el reclamo.');
      return;
    }
    if (detalle.trim().length < 10) {
      setDetalleError('Cuéntanos qué pasó con un poco más de detalle.');
      return;
    }

    setEnviando(true);
    try {
      const body: CrearReclamoRequest = { tipo, contra, detalle: detalle.trim() };
      const resp = unwrap(await api.post<ApiResponse<AcuseReclamoResponse>>(endpoints.reclamos.crear(), body));
      setAcuse(resp);
      setDetalle('');
      setContra(null);
      setTipo('RECLAMO');
      await run();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No pudimos registrar tu reclamo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Screen
      scroll
      padded
      header={
        <ScreenHeader
          title="Libro de reclamaciones"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
      }
    >
      <View style={s.root}>
        <StateBanner
          tone="info"
          icon="mail"
          title="Te respondemos por correo"
          message="Las respuestas a tus reclamos y quejas llegan a tu correo institucional, fuera de la app."
        />

        {acuse ? (
          <Card>
            <View style={s.constancia}>
              <Text variant="sectionLabel">Constancia registrada</Text>
              <Text variant="h2">{acuse.codigoConstancia}</Text>
              <Text variant="small" color="textSecondary">
                {acuse.mensaje}
              </Text>
              {acuse.plazoRespuestaAt ? (
                <Text variant="small" color="textMuted">
                  {`Plazo de respuesta: ${formatDateTime(acuse.plazoRespuestaAt)}`}
                </Text>
              ) : null}
              <View style={s.constanciaAccion}>
                <Button title="Registrar otro" variant="outline" onPress={() => setAcuse(null)} />
              </View>
            </View>
          </Card>
        ) : (
          <View style={s.form}>
            <Text variant="h3">Registrar un reclamo o queja</Text>

            <View style={s.bloque}>
              <Text variant="label" color="textPrimary">
                Tipo
              </Text>
              <Segmented options={TIPO_OPCIONES} value={tipo} onChange={(v) => setTipo(v as TipoReclamo)} fullWidth />
            </View>

            <Select
              label="¿Contra quién?"
              options={CONTRA_OPCIONES}
              value={contra}
              onChange={(v) => setContra(v as DestinatarioReclamo)}
              placeholder="Elige un destinatario"
            />

            <TextArea
              label="Detalle"
              value={detalle}
              onChangeText={(v) => {
                setDetalle(v);
                setDetalleError(undefined);
              }}
              placeholder="Cuéntanos qué pasó."
              numberOfLines={4}
              maxLength={500}
              error={detalleError}
            />

            <Button title="Enviar" onPress={enviar} loading={enviando} fullWidth />
          </View>
        )}

        <View style={s.lista}>
          <Text variant="sectionLabel">Tus reclamos</Text>
          {loading && !mios ? (
            <View style={s.skeletons}>
              <Skeleton width="100%" height={72} radius={t.radii.card} />
              <Skeleton width="100%" height={72} radius={t.radii.card} />
            </View>
          ) : error && !mios ? (
            <StateBanner
              tone="error"
              title="No pudimos cargar tus reclamos"
              message={error.message}
              action={{ label: 'Reintentar', onPress: () => run().catch(() => {}) }}
            />
          ) : !mios || mios.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="Aún no tienes reclamos"
              message="Cuando registres uno, aparecerá aquí con su constancia y estado."
            />
          ) : (
            mios.map((reclamo) => (
              <Card key={reclamo.id}>
                <View style={s.itemEncabezado}>
                  <Text variant="label" color="textPrimary">
                    {reclamo.codigoConstancia}
                  </Text>
                  <StatusBadge
                    tone={RECLAMO_TONE[reclamo.estado]}
                    label={ESTADO_RECLAMO_LABELS[reclamo.estado]}
                    size="sm"
                  />
                </View>
                <Text variant="small" color="textMuted">
                  {`${TIPO_RECLAMO_LABELS[reclamo.tipo]} · ${DESTINATARIO_LABELS[reclamo.contra]}`}
                </Text>
                <Text variant="small" color="textSecondary" numberOfLines={2} style={s.itemDetalle}>
                  {reclamo.detalle}
                </Text>
                {reclamo.respuesta ? (
                  <View style={s.respuesta}>
                    <Text variant="label" color="textPrimary">
                      Respuesta
                    </Text>
                    <Text variant="small" color="textSecondary">
                      {reclamo.respuesta}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[4] },
    form: { gap: t.spacing[3] },
    bloque: { gap: t.spacing[2] },
    constancia: { gap: t.spacing[2] },
    constanciaAccion: { marginTop: t.spacing[2], alignSelf: 'flex-start' },
    lista: { gap: t.spacing[2] },
    skeletons: { gap: t.spacing[2] },
    itemEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    itemDetalle: { marginTop: t.spacing[1] },
    respuesta: { marginTop: t.spacing[2], gap: 2 },
  });
}
