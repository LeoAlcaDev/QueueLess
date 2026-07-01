import { useMemo, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ALERGENO_LABELS, APTITUD_LABELS, toneColors, type StatusTone } from '@/lib';
import type { Alergeno, AptitudDietetica, FranjaOcupacion, TipoEntrega } from '@/api/types';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { Chip } from './Chip';
import { EmptyState } from './EmptyState';

// Composites de dominio compartidos por varias áreas (cliente, comercio, repartidor),
// armados sobre los primitivos. Viven en la base para no duplicarlos por feature.

export interface MetricCardProps {
  icon: IconName;
  value: ReactNode;
  label: string;
  tone?: StatusTone;
}

export function MetricCard({ icon, value, label, tone = 'brand' }: MetricCardProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const tones = toneColors(t.colors, tone);
  return (
    <View style={s.metric}>
      <View style={[s.metricIcon, { backgroundColor: tones.bg }]}>
        <Icon name={icon} size={18} color={tones.fg} />
      </View>
      {typeof value === 'string' || typeof value === 'number' ? <Text variant="h3">{value}</Text> : value}
      <Text variant="small" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

export interface QueuePointsBadgeProps {
  amount: number;
  prefix?: string;
}

export function QueuePointsBadge({ amount, prefix = '' }: QueuePointsBadgeProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.qpts}>
      <Icon name="bolt" size={14} color={t.colors.points} />
      <Text variant="badge" color="pointsStrong">{`${prefix}${amount}`}</Text>
    </View>
  );
}

export interface SummaryRowProps {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'points';
}

export function SummaryRow({ label, value, strong, tone }: SummaryRowProps) {
  const labelColor = strong ? 'textPrimary' : 'textSecondary';
  const valueColor = tone === 'points' ? 'pointsStrong' : 'textPrimary';
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'body' : 'small'} color={tone === 'points' ? 'pointsStrong' : labelColor}>
        {label}
      </Text>
      <Text variant={strong ? 'h3' : 'small'} color={valueColor}>
        {value}
      </Text>
    </View>
  );
}

export interface FoodThumbProps {
  uri?: string | null;
  size?: number;
  radius?: number;
  hero?: boolean;
}

// muestra la foto del producto si hay; si no, un placeholder con ícono de comida
export function FoodThumb({ uri, size = 64, radius, hero }: FoodThumbProps) {
  const t = useTheme();
  const r = radius ?? t.radii.card;
  const width: DimensionValue = hero ? '100%' : size;
  const height = hero ? 200 : size;
  const box = { width, height, borderRadius: r };

  if (uri) {
    return <Image source={{ uri }} style={[box, { backgroundColor: t.colors.bgSurface2 }]} resizeMode="cover" />;
  }
  return (
    <View style={[box, styles.center, { backgroundColor: hero ? t.colors.brandSoft : t.colors.bgSurface2 }]}>
      <Icon
        name="utensils"
        size={hero ? 56 : Math.round(size * 0.42)}
        color={hero ? t.colors.textBrand : t.colors.textMuted}
        strokeWidth={1.5}
      />
    </View>
  );
}

export function AllergenChip({ alergenos }: { alergenos: Alergeno[] }) {
  if (!alergenos || alergenos.length === 0) return null;
  const texto = alergenos.map((a) => ALERGENO_LABELS[a]).join(', ');
  return <Chip label={`Contiene: ${texto}`} tone="warning" icon="alertTriangle" size="sm" />;
}

export function AptitudeChips({ aptitudes }: { aptitudes: AptitudDietetica[] }) {
  if (!aptitudes || aptitudes.length === 0) return null;
  return (
    <>
      {aptitudes.map((a) => (
        <Chip key={a} label={APTITUD_LABELS[a]} tone="success" icon="leaf" size="sm" />
      ))}
    </>
  );
}

export interface OccupancyChartProps {
  franjas: FranjaOcupacion[];
  horaActual?: number;
  hayDatosSuficientes?: boolean;
}

// curva de ocupación por hora; la altura de cada barra sale de los pedidos típicos
// de esa franja, y se resalta la hora actual
export function OccupancyChart({ franjas, horaActual, hayDatosSuficientes = true }: OccupancyChartProps) {
  const t = useTheme();
  if (!hayDatosSuficientes || !franjas || franjas.length === 0) {
    return (
      <EmptyState
        icon="barChart"
        title="Aún recopilando datos"
        message="Mostraremos la ocupación por hora cuando haya suficientes pedidos."
      />
    );
  }
  const max = Math.max(...franjas.map((f) => f.pedidosTipicos ?? 0), 1);
  return (
    <View style={styles.chartRow}>
      {franjas.map((f) => {
        const on = f.hora === horaActual;
        const height = Math.max(4, ((f.pedidosTipicos ?? 0) / max) * 84);
        return (
          <View key={f.hora} style={styles.chartCol}>
            <View
              style={{
                width: '100%',
                maxWidth: 22,
                height,
                borderRadius: 5,
                backgroundColor: on ? t.colors.brandStrong : t.colors.brandSoft,
                borderWidth: on ? 0 : 1,
                borderColor: t.colors.borderDefault,
              }}
            />
            <Text variant="badge" color={on ? 'textBrand' : 'textMuted'}>
              {String(f.hora).padStart(2, '0')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export interface PickupDeliveryToggleProps {
  value: TipoEntrega;
  onChange: (v: TipoEntrega) => void;
}

interface EntregaOption {
  value: TipoEntrega;
  label: string;
  icon: IconName;
}

const ENTREGA_OPTIONS: EntregaOption[] = [
  { value: 'PICKUP', label: 'Recojo', icon: 'shoppingBag' },
  { value: 'DELIVERY', label: 'Delivery', icon: 'users' },
];

// segmentado de dos opciones para el tipo de entrega, con ícono + texto en cada lado
export function PickupDeliveryToggle({ value, onChange }: PickupDeliveryToggleProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.entregaTrack}>
      {ENTREGA_OPTIONS.map((option) => {
        const active = option.value === value;
        const fg = active ? t.colors.textPrimary : t.colors.textSecondary;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[s.entregaSegment, active && s.entregaSegmentActive]}
          >
            <Icon name={option.icon} size={18} color={fg} />
            <Text variant="label" color={active ? 'textPrimary' : 'textSecondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 110 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5, height: '100%' },
});

function makeStyles(t: Theme) {
  return StyleSheet.create({
    metric: {
      flex: 1,
      gap: 6,
      padding: t.spacing[3],
      borderRadius: t.radii.card,
      backgroundColor: t.colors.bgSurface,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
    },
    metricIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qpts: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.pointsSoft,
      alignSelf: 'flex-start',
    },
    entregaTrack: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      backgroundColor: t.colors.bgSurface2,
      borderRadius: t.radii.button,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      padding: 3,
      gap: 2,
    },
    entregaSegment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing[2],
      paddingVertical: t.spacing[2],
      borderRadius: t.radii.button - 3,
    },
    entregaSegmentActive: { backgroundColor: t.colors.bgSurface, ...t.shadow.sm },
  });
}
