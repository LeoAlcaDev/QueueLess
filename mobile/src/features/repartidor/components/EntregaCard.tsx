import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Card, QueuePointsBadge, StatusBadge, Text } from '@/components';
import { ESTADO_SOLICITUD_LABELS, ESTADO_SOLICITUD_TONE, formatDateTime } from '@/lib';
import type { SolicitudDeliveryResponse } from '@/api';

export interface EntregaCardProps {
  solicitud: SolicitudDeliveryResponse;
}

// fecha que mejor describe la entrega según hasta dónde avanzó
function fechaEntrega(s: SolicitudDeliveryResponse): string {
  return formatDateTime(s.entregadoAt ?? s.recogidoAt ?? s.asignadoAt ?? s.busquedaInicioAt);
}

// Una fila del historial del repartidor: local de origen, zona, estado y, cuando la
// entrega quedó completada, los +50 QueuePoints ganados.
export function EntregaCard({ solicitud }: EntregaCardProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const entregada = solicitud.estado === 'ENTREGADO';

  return (
    <Card padding={14}>
      <View style={s.header}>
        <View style={s.headerTextos}>
          <Text variant="small" color="textPrimary" style={s.local} numberOfLines={1}>
            {solicitud.puntoDeVentaNombre}
          </Text>
          <Text variant="small" color="textMuted">
            {solicitud.zonaEntrega}
          </Text>
        </View>
        <StatusBadge
          tone={ESTADO_SOLICITUD_TONE[solicitud.estado]}
          label={ESTADO_SOLICITUD_LABELS[solicitud.estado]}
          size="sm"
        />
      </View>
      <View style={s.footer}>
        <Text variant="small" color="textMuted">
          {fechaEntrega(solicitud)}
        </Text>
        {entregada ? <QueuePointsBadge amount={50} prefix="+" /> : null}
      </View>
    </Card>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: t.spacing[2] },
    headerTextos: { flex: 1, minWidth: 0, gap: 1 },
    local: { fontFamily: t.fontFamily.semibold },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: t.spacing[3] },
  });
}
