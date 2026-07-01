import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button, Card, Chip, QueuePointsBadge, Text } from '@/components';
import type { SolicitudDeliveryResponse } from '@/api';

export interface SolicitudCardProps {
  solicitud: SolicitudDeliveryResponse;
  onAccept: () => void;
  accepting?: boolean;
}

// minutos que el cliente lleva esperando un repartidor, a partir de cuándo arrancó
// la búsqueda; si no hay marca de inicio no mostramos el chip de espera
function minutosEsperando(inicioAt: string | null): number | null {
  if (!inicioAt) return null;
  const inicio = new Date(inicioAt).getTime();
  if (Number.isNaN(inicio)) return null;
  const min = Math.floor((Date.now() - inicio) / 60000);
  return min < 0 ? 0 : min;
}

// Tarjeta de una entrega disponible: origen (local) → destino (zona), los +50
// QueuePoints que se ganan y cuánto lleva esperando el cliente. La acción grande
// "Aceptar entrega" ocupa todo el ancho para usarla con una mano.
export function SolicitudCard({ solicitud, onAccept, accepting = false }: SolicitudCardProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const espera = minutosEsperando(solicitud.busquedaInicioAt);

  return (
    <Card padding={14}>
      <View style={s.ruta}>
        <View style={s.railColumn}>
          <View style={s.railDotOrigen} />
          <View style={s.railLine} />
          <View style={s.railDotDestino} />
        </View>
        <View style={s.rutaTextos}>
          <View>
            <Text variant="sectionLabel">Origen</Text>
            <Text variant="small" color="textPrimary" style={s.lugarNombre}>
              {solicitud.puntoDeVentaNombre}
            </Text>
            <Text variant="small" color="textSecondary">
              {solicitud.puntoDeVentaUbicacion}
            </Text>
          </View>
          <View style={s.destinoBloque}>
            <Text variant="sectionLabel">Destino</Text>
            <Text variant="small" color="textPrimary" style={s.lugarNombre}>
              {solicitud.zonaEntrega}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.chips}>
        <QueuePointsBadge amount={50} prefix="+" />
        {espera !== null ? <Chip tone="warning" icon="clock" label={`Cliente espera ${espera} min`} size="sm" /> : null}
      </View>

      <View style={s.pedidoRef}>
        <Text variant="small" color="textSecondary">
          Entrega comunitaria · Pedido #{solicitud.pedidoId}
        </Text>
      </View>

      <Button title="Aceptar entrega" onPress={onAccept} loading={accepting} fullWidth />
    </Card>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    ruta: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing[3] },
    railColumn: { alignItems: 'center', gap: 3, paddingTop: 4 },
    railDotOrigen: { width: 10, height: 10, borderRadius: t.radii.pill, backgroundColor: t.colors.brandStrong },
    railLine: { width: 2, height: 26, backgroundColor: t.colors.borderDefault },
    railDotDestino: { width: 10, height: 10, borderRadius: 3, backgroundColor: t.colors.points },
    rutaTextos: { flex: 1, minWidth: 0 },
    lugarNombre: { fontFamily: t.fontFamily.semibold },
    destinoBloque: { marginTop: t.spacing[2] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2], marginVertical: t.spacing[3] },
    pedidoRef: {
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
      paddingTop: t.spacing[3],
      marginBottom: t.spacing[3],
    },
  });
}
