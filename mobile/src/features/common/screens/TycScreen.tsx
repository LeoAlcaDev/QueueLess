import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Icon, Screen, Skeleton, StateBanner, Text } from '@/components/ui';
import { ScreenHeader, TermsBody } from '@/features/common/components';
import { useApi, useToast } from '@/hooks';
import { api, ApiError, endpoints, unwrap } from '@/api';
import type { ApiResponse, TycEstadoResponse } from '@/api/types';
import { formatDateTime } from '@/lib';

// Términos y condiciones de la cuenta. Consulta el estado: si el usuario ya aceptó
// la versión vigente, muestra un aviso de que está al día; si no (primera vez o
// versión nueva), pide aceptarla para continuar.
export function TycScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const navigation = useNavigation<any>();
  const toast = useToast();
  const [aceptando, setAceptando] = useState(false);

  const cargar = useCallback(
    (signal: AbortSignal) =>
      api.get<ApiResponse<TycEstadoResponse>>(endpoints.tyc.get(), { signal }).then(unwrap),
    [],
  );
  const { data, loading, error, run } = useApi(cargar);

  useEffect(() => {
    run().catch(() => {});
  }, [run]);

  async function onAceptar() {
    setAceptando(true);
    try {
      await api.post(endpoints.tyc.aceptar(), {});
      toast.success('Aceptaste los términos vigentes.');
      await run();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No pudimos registrar tu aceptación.');
    } finally {
      setAceptando(false);
    }
  }

  const pendiente = data ? !data.aceptoVersionVigente : false;

  return (
    <Screen
      scroll
      padded
      header={
        <ScreenHeader
          title="Términos y condiciones"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
      }
      footer={
        pendiente ? (
          <Button title="Aceptar y continuar" onPress={onAceptar} loading={aceptando} fullWidth />
        ) : undefined
      }
    >
      <View style={s.root}>
        {loading && !data ? (
          <View style={s.skeletons}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="40%" height={14} />
            <Skeleton width="100%" height={120} radius={t.radii.card} />
          </View>
        ) : error && !data ? (
          <StateBanner
            tone="error"
            title="No pudimos cargar los términos"
            message={error.message}
            action={{ label: 'Reintentar', onPress: () => run().catch(() => {}) }}
          />
        ) : data ? (
          <>
            <View style={s.encabezado}>
              <View style={s.icono}>
                <Icon name="fileText" size={20} color={t.colors.textBrand} />
              </View>
              <View style={s.encabezadoTextos}>
                <Text variant="h3">Términos y Condiciones</Text>
                <Text variant="small" color="textMuted">
                  {`Versión vigente · ${data.versionVigente}`}
                </Text>
              </View>
            </View>

            {data.aceptoVersionVigente ? (
              <StateBanner
                tone="success"
                title="Estás al día"
                message={
                  data.aceptadoAt
                    ? `Aceptaste la versión vigente el ${formatDateTime(data.aceptadoAt)}.`
                    : 'Aceptaste la versión vigente.'
                }
              />
            ) : data.versionAceptada ? (
              <StateBanner
                tone="warning"
                title="Hay una versión nueva"
                message={`Aceptaste la ${data.versionAceptada}. Revisa los cambios y acéptala para continuar.`}
              />
            ) : (
              <StateBanner
                tone="info"
                title="Acepta para continuar"
                message="Revisa los términos y acéptalos para usar la app."
              />
            )}

            <TermsBody />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[4] },
    skeletons: { gap: t.spacing[3] },
    encabezado: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    icono: {
      width: 40,
      height: 40,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    encabezadoTextos: { flex: 1 },
  });
}
