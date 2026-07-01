import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import type { PuntoDeVentaResponse } from '@/api';
import { Card, Icon, Text, WaitBadge } from '@/components';

export interface VendorCardProps {
  vendor: PuntoDeVentaResponse;
  onPress: () => void;
}

// Card de un local en el Home: banda con foto de relleno + píldora abierto/cerrado,
// nombre, ubicación y, si hay dato, el tiempo de espera y la tasa de cumplimiento.
export function VendorCard({ vendor, onPress }: VendorCardProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const dotColor = vendor.abierto ? t.colors.accent : t.colors.textMuted;

  return (
    <Card padding={0} onPress={onPress} style={s.card}>
      <View style={s.band}>
        <Icon name="store" size={36} color={t.colors.textMuted} strokeWidth={1.4} />
        <View style={s.statusPill}>
          <View style={[s.dot, { backgroundColor: dotColor }]} />
          <Text variant="badge" color="textPrimary">
            {vendor.abierto ? 'Abierto' : 'Cerrado'}
          </Text>
        </View>
      </View>
      <View style={s.body}>
        <Text variant="h3" numberOfLines={1}>
          {vendor.nombre}
        </Text>
        <View style={s.metaRow}>
          <Icon name="mapPin" size={13} color={t.colors.textSecondary} />
          <Text variant="small" color="textSecondary" numberOfLines={1} style={s.meta}>
            {vendor.ubicacion}
          </Text>
        </View>
        <View style={s.footer}>
          {vendor.tiempoEsperaEstimado != null ? <WaitBadge minutes={vendor.tiempoEsperaEstimado} /> : null}
          {vendor.tasaCumplimiento != null ? (
            <Text variant="small" color="textMuted">
              {Math.round(vendor.tasaCumplimiento * 100)}% cumplimiento
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    card: { overflow: 'hidden' },
    band: {
      height: 116,
      backgroundColor: t.colors.bgSurface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusPill: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.bgSurface,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
    },
    dot: { width: 6, height: 6, borderRadius: t.radii.pill },
    body: { padding: t.spacing[3], gap: t.spacing[1] },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] },
    meta: { flex: 1 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[2], marginTop: t.spacing[1] },
  });
}
