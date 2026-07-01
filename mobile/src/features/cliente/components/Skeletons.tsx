import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Card, Skeleton } from '@/components';

// Esqueletos de carga: la pantalla "cargando" se ve distinta de la "poblada", no un
// spinner genérico.

export function VendorCardSkeleton() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Card padding={0} style={s.card}>
      <Skeleton height={116} radius={0} />
      <View style={s.body}>
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" height={12} />
        <Skeleton width={90} height={22} radius={999} />
      </View>
    </Card>
  );
}

export function OrderCardSkeleton() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Card padding={14}>
      <View style={s.line}>
        <Skeleton width="45%" height={16} />
        <Skeleton width={80} height={20} radius={999} />
      </View>
      <View style={s.gap} />
      <Skeleton width="80%" height={12} />
      <View style={s.gap} />
      <View style={s.line}>
        <Skeleton width={120} height={12} />
        <Skeleton width={60} height={14} />
      </View>
    </Card>
  );
}

export function ProductRowSkeleton() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.product}>
      <Skeleton width={76} height={76} radius={t.radii.card} />
      <View style={s.productInfo}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="90%" height={12} />
        <Skeleton width={70} height={20} />
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    card: { overflow: 'hidden' },
    body: { padding: t.spacing[3], gap: t.spacing[2] },
    line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    gap: { height: t.spacing[2] },
    product: { flexDirection: 'row', gap: t.spacing[3] },
    productInfo: { flex: 1, gap: t.spacing[2], justifyContent: 'center' },
  });
}
