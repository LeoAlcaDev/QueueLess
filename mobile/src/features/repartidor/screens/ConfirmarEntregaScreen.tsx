import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Card, Icon, QrScanner, Screen, StateBanner, Text } from '@/components';
import { useApi, useToast } from '@/hooks';
import { api, endpoints, unwrap } from '@/api';
import type { ApiError, ApiResponse, SaldoResponse, SolicitudDeliveryResponse } from '@/api';
import { useRepartidor } from '../state/RepartidorContext';

// Cierra la entrega escaneando el QR del cliente (con la cámara, a pantalla
// completa) o ingresando el código a mano. Si el código no coincide, lo decimos
// con calma y dejamos reintentar. Al confirmar, +50 QueuePoints y vuelta al inicio.
export function ConfirmarEntregaScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const toast = useToast();
  const { activeSolicitudId, clearActive } = useRepartidor();

  const [done, setDone] = useState(false);
  const [saldoFinal, setSaldoFinal] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const confirmar = useApi(
    useCallback(async (signal: AbortSignal, id: number, codigo: string) => {
      const res = await api.post<ApiResponse<SolicitudDeliveryResponse>>(
        endpoints.repartidor.confirmarEntrega(id),
        { codigo },
        { signal },
      );
      return unwrap(res);
    }, []),
  );

  async function onScan(codigo: string) {
    if (activeSolicitudId === null) return;
    setErrorMsg(null);
    try {
      await confirmar.run(activeSolicitudId, codigo);
      try {
        const res = await api.get<ApiResponse<SaldoResponse>>(endpoints.queuepoints.saldo());
        setSaldoFinal(unwrap(res).saldo);
      } catch {
        // si el saldo no carga, igual mostramos el éxito sin el total
      }
      clearActive();
      setDone(true);
    } catch (err) {
      const apiError = err as ApiError;
      // 422: el código no calza con el QR del cliente. Mostramos el aviso y
      // remontamos el escáner para poder reintentar.
      if (apiError.kind === 'business') setErrorMsg(apiError.message);
      else toast.error(apiError.message);
      setIntento((n) => n + 1);
    }
  }

  function volver() {
    // limpiamos el stack de la entrega y saltamos a las solicitudes disponibles
    nav.popToTop();
    nav.navigate('Disponibles');
  }

  if (activeSolicitudId === null) {
    return (
      <Screen>
        <StateBanner
          tone="info"
          title="No hay una entrega por confirmar"
          message="Vuelve a solicitudes para tomar una entrega."
          action={{ label: 'Ver solicitudes', onPress: volver }}
        />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <View style={s.exito}>
          <View style={s.exitoIcon}>
            <Icon name="checkCheck" size={40} color={t.colors.successFg} />
          </View>
          <View style={s.exitoTextos}>
            <Text variant="h2" align="center">
              Entrega completada
            </Text>
            <Text variant="body" color="textSecondary" align="center">
              Gracias por ayudar a otro estudiante
            </Text>
          </View>
          <View style={s.puntosGanados}>
            <Icon name="bolt" size={26} color={t.colors.pointsStrong} />
            <Text variant="h2" style={s.puntosTexto}>
              +50 QueuePoints
            </Text>
          </View>
          {saldoFinal !== null ? (
            <Card padding={14} style={s.saldoCard}>
              <View style={s.saldoRow}>
                <View>
                  <Text variant="badge" color="textMuted">
                    Saldo total
                  </Text>
                  <Text variant="h3" style={s.saldoMonto}>
                    {`${saldoFinal} QueuePoints`}
                  </Text>
                </View>
                <Icon name="bolt" size={24} color={t.colors.points} />
              </View>
            </Card>
          ) : null}
          <Button title="Volver a solicitudes" onPress={volver} fullWidth />
        </View>
      </Screen>
    );
  }

  return (
    <View style={s.scanRoot}>
      <QrScanner
        key={intento}
        onScan={onScan}
        onCancel={() => nav.goBack()}
        hint="Apunta al QR del cliente para cerrar la entrega."
        allowManual
      />
      {errorMsg ? (
        <View style={[s.errorOverlay, { top: insets.top + t.spacing[2] }]} pointerEvents="box-none">
          <StateBanner tone="error" title="El código no coincide" message={errorMsg} />
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    scanRoot: { flex: 1, backgroundColor: '#1C1917' },
    errorOverlay: { position: 'absolute', left: t.spacing[4], right: t.spacing[4] },
    exito: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing[4] },
    exitoIcon: {
      width: 80,
      height: 80,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.successBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exitoTextos: { gap: 2 },
    puntosGanados: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] },
    puntosTexto: { color: t.colors.pointsStrong },
    saldoCard: { width: '100%', maxWidth: 320 },
    saldoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    saldoMonto: { color: t.colors.pointsStrong },
  });
}
