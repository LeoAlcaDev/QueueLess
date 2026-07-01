import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrap, unwrapPage } from '@/api';
import type {
  ApiResponse,
  CrearReclamoRequest,
  DestinatarioReclamo,
  PageResponse,
  PedidoResponse,
  PuntoDeVentaResponse,
  ReclamoResponse,
  TipoReclamo,
} from '@/api';
import { useApi, useToast } from '@/hooks';
import { useAuth } from '@/auth';
import {
  DESTINATARIO_LABELS,
  ESTADO_RECLAMO_LABELS,
  TIPO_RECLAMO_LABELS,
  formatRelative,
} from '@/lib';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  Screen,
  Segmented,
  Select,
  Spinner,
  StateBanner,
  StatusBadge,
  Text,
  TextArea,
} from '@/components';
import { TopBar } from '../components';

type Mode = 'list' | 'create' | 'acuse';

function asList<T>(data: T[] | PageResponse<T>): T[] {
  return Array.isArray(data) ? data : data.content;
}

export function ReclamosScreen() {
  const navigation = useNavigation<any>();
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const toast = useToast();
  const { user } = useAuth();

  const [mode, setMode] = useState<Mode>('list');
  const [tipo, setTipo] = useState<TipoReclamo>('RECLAMO');
  const [contra, setContra] = useState<DestinatarioReclamo>('COMERCIO');
  const [local, setLocal] = useState<string | null>(null);
  const [pedido, setPedido] = useState<string | null>(null);
  const [detalle, setDetalle] = useState('');
  const [detalleError, setDetalleError] = useState<string | undefined>(undefined);
  const [acuse, setAcuse] = useState<ReclamoResponse | null>(null);

  const mios = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<ReclamoResponse[] | PageResponse<ReclamoResponse>>>(
        endpoints.reclamos.mios(),
        { signal },
      );
      return asList(unwrap(res));
    }, []),
  );
  const puntos = useApi(
    useCallback(async (signal: AbortSignal) => {
      // el catálogo de locales llega como lista plana, no paginado
      const res = await api.get<ApiResponse<PuntoDeVentaResponse[] | PageResponse<PuntoDeVentaResponse>>>(
        endpoints.catalogo.puntos(),
        { signal },
      );
      return asList(unwrap(res));
    }, []),
  );
  const pedidos = useApi(
    useCallback(async (signal: AbortSignal) => {
      const res = await api.get<ApiResponse<PageResponse<PedidoResponse>>>(endpoints.cliente.pedidos(), {
        params: { page: 0, size: 50 },
        signal,
      });
      return unwrapPage(res).content;
    }, []),
  );

  useEffect(() => {
    mios.run().catch(() => {});
    puntos.run().catch(() => {});
    pedidos.run().catch(() => {});
  }, [mios.run, puntos.run, pedidos.run]);

  const crear = useApi((signal, body: CrearReclamoRequest) =>
    api.post<ApiResponse<ReclamoResponse>>(endpoints.reclamos.crear(), body, { signal }).then(unwrap),
  );

  async function enviar() {
    if (!detalle.trim()) {
      setDetalleError('Cuéntanos qué pasó');
      return;
    }
    setDetalleError(undefined);
    const body: CrearReclamoRequest = {
      tipo,
      contra,
      puntoDeVentaId: contra === 'COMERCIO' && local ? Number(local) : undefined,
      pedidoId: pedido ? Number(pedido) : undefined,
      detalle: detalle.trim(),
    };
    try {
      const res = await crear.run(body);
      setAcuse(res);
      setMode('acuse');
      mios.run().catch(() => {});
    } catch {
      toast.error(crear.error?.message ?? 'No pudimos registrar tu reclamo.');
    }
  }

  function resetForm() {
    setTipo('RECLAMO');
    setContra('COMERCIO');
    setLocal(null);
    setPedido(null);
    setDetalle('');
    setDetalleError(undefined);
  }

  const title = mode === 'create' ? 'Crear reclamo' : mode === 'acuse' ? 'Constancia' : 'Mis reclamos';
  const onBack =
    mode === 'list'
      ? () => navigation.goBack()
      : () => {
          resetForm();
          setMode('list');
        };

  // ── Constancia ──
  if (mode === 'acuse' && acuse) {
    return (
      <Screen scroll padded={false} header={<TopBar title={title} onBack={onBack} />}>
        <View style={s.content}>
          <Card padding={0} style={s.acuseCard}>
            <View style={s.acuseHead}>
              <View style={s.acuseCircle}>
                <Icon name="checkCircle" size={28} color="#fff" />
              </View>
              <Text variant="h3" align="center">
                Reclamo registrado
              </Text>
              <Text variant="small" color="textSecondary" align="center">
                Guarda tu código de constancia
              </Text>
            </View>
            <View style={s.acuseBody}>
              <Text variant="sectionLabel" align="center">
                Código de constancia
              </Text>
              <Text variant="h2" align="center" style={s.acuseCode}>
                {acuse.codigoConstancia}
              </Text>
              <Text variant="small" color="textSecondary" align="center">
                Te responderemos en un plazo máximo de 48 horas. Como en el libro de reclamaciones, tu constancia
                queda registrada.
              </Text>
              <Button
                title="Ver mis reclamos"
                onPress={() => {
                  resetForm();
                  setMode('list');
                }}
                fullWidth
              />
            </View>
          </Card>
        </View>
      </Screen>
    );
  }

  // ── Crear ──
  if (mode === 'create') {
    const cta = <Button title="Enviar reclamo" leftIcon="send" onPress={enviar} loading={crear.loading} fullWidth />;
    return (
      <Screen scroll padded={false} header={<TopBar title={title} onBack={onBack} />} footer={cta}>
        <View style={s.content}>
          <View style={s.block}>
            <Text variant="sectionLabel">Tipo</Text>
            <Segmented
              fullWidth
              value={tipo}
              onChange={(v) => setTipo(v as TipoReclamo)}
              options={[
                { label: 'Reclamo', value: 'RECLAMO' },
                { label: 'Queja', value: 'QUEJA' },
              ]}
            />
          </View>
          <View style={s.block}>
            <Text variant="sectionLabel">¿Contra quién?</Text>
            <Segmented
              fullWidth
              value={contra}
              onChange={(v) => setContra(v as DestinatarioReclamo)}
              options={[
                { label: 'Un comercio', value: 'COMERCIO' },
                { label: 'La plataforma', value: 'PLATAFORMA' },
              ]}
            />
          </View>
          {contra === 'COMERCIO' ? (
            <Select
              label="Local"
              value={local}
              onChange={setLocal}
              placeholder="Elige el local"
              options={(puntos.data ?? []).map((p) => ({ label: p.nombre, value: String(p.id) }))}
            />
          ) : null}
          <Select
            label="Pedido relacionado (opcional)"
            value={pedido}
            onChange={setPedido}
            placeholder="Sin pedido"
            options={(pedidos.data ?? []).map((p) => ({ label: p.codigo, value: String(p.id) }))}
          />
          <TextArea
            label="Detalle"
            value={detalle}
            onChangeText={setDetalle}
            placeholder="Describe lo sucedido…"
            numberOfLines={4}
            maxLength={2000}
            error={detalleError}
          />
        </View>
      </Screen>
    );
  }

  // ── Lista ──
  const cta = <Button title="Crear reclamo" leftIcon="plus" onPress={() => setMode('create')} fullWidth />;
  return (
    <Screen scroll padded={false} header={<TopBar title={title} onBack={onBack} />} footer={cta}>
      <View style={s.content}>
        <StateBanner
          tone="info"
          title="Tus respuestas llegan por correo"
          message={`Por ahora te respondemos los reclamos a tu correo (${user?.email ?? 'tu correo'}), no dentro de la app. Revisa tu bandeja de entrada.`}
        />

        {mios.loading ? (
          <View style={s.center}>
            <Spinner />
          </View>
        ) : mios.error ? (
          <StateBanner
            tone="error"
            title="No pudimos cargar tus reclamos"
            message={mios.error.message}
            action={{ label: 'Reintentar', onPress: () => mios.run().catch(() => {}) }}
          />
        ) : (mios.data ?? []).length === 0 ? (
          <EmptyState
            icon="messageCircle"
            title="No tienes reclamos"
            message="Si algo sale mal con un pedido, puedes dejar un reclamo o queja aquí."
          />
        ) : (
          <View style={s.list}>
            {(mios.data ?? []).map((r) => (
              <Card key={r.id} padding={14}>
                <View style={s.reclamoHead}>
                  <View style={s.reclamoTitle}>
                    <Text variant="label" color="textPrimary">
                      {`${TIPO_RECLAMO_LABELS[r.tipo]} · ${DESTINATARIO_LABELS[r.contra]}`}
                    </Text>
                    <Text variant="small" color="textMuted" style={s.code}>
                      {`${r.codigoConstancia} · ${formatRelative(r.creadoAt)}`}
                    </Text>
                  </View>
                  <StatusBadge
                    tone={r.estado === 'RESPONDIDO' ? 'success' : 'warning'}
                    label={ESTADO_RECLAMO_LABELS[r.estado]}
                    size="sm"
                  />
                </View>
                <Text variant="small" color="textSecondary" style={s.detalle}>
                  {r.detalle}
                </Text>
                {r.respuesta ? (
                  <View style={s.respuesta}>
                    <Text variant="sectionLabel">Respuesta</Text>
                    <Text variant="small" color="textPrimary">
                      {r.respuesta}
                    </Text>
                  </View>
                ) : (
                  <View style={s.correoNote}>
                    <Icon name="clock" size={15} color={t.colors.textMuted} />
                    <Text variant="small" color="textSecondary">
                      En revisión · te responderemos por correo
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4], gap: t.spacing[4] },
    block: { gap: t.spacing[2] },
    center: { paddingVertical: t.spacing[8], alignItems: 'center' },
    list: { gap: t.spacing[3] },
    reclamoHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: t.spacing[2] },
    reclamoTitle: { flex: 1, gap: 1 },
    code: { fontVariant: ['tabular-nums'] },
    detalle: { marginTop: t.spacing[2] },
    respuesta: {
      marginTop: t.spacing[3],
      padding: t.spacing[3],
      borderRadius: t.radii.input,
      backgroundColor: t.colors.bgSurface2,
      borderLeftWidth: 3,
      borderLeftColor: t.colors.accent,
      gap: 3,
    },
    correoNote: {
      marginTop: t.spacing[3],
      paddingTop: t.spacing[3],
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[2],
    },
    acuseCard: { overflow: 'hidden' },
    acuseHead: { backgroundColor: t.colors.successBg, padding: t.spacing[6], alignItems: 'center', gap: t.spacing[1] },
    acuseCircle: {
      width: 56,
      height: 56,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.successDot,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.spacing[1],
    },
    acuseBody: { padding: t.spacing[6], alignItems: 'center', gap: t.spacing[3] },
    acuseCode: { letterSpacing: 2, fontVariant: ['tabular-nums'] },
  });
}
