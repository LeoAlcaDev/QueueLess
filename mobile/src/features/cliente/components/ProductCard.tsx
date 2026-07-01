import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import type { ProductoResponse } from '@/api';
import {
  AllergenChip,
  AptitudeChips,
  FoodThumb,
  Icon,
  Price,
  Stepper,
  Text,
} from '@/components';
import { SpiceLevel } from './SpiceLevel';

export interface ProductCardProps {
  product: ProductoResponse;
  qty: number;
  onAdd: () => void;
  onSetQty: (qty: number) => void;
  onOpen: () => void;
}

// Card de producto dentro del menú de un local. La foto y el precio mandan; los
// alérgenos se ven siempre. Si no está pedible ahora, se atenúa y se muestra la razón.
export function ProductCard({ product, qty, onAdd, onSetQty, onOpen }: ProductCardProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const off = !product.disponibleAhora;

  return (
    <View style={[s.root, off && s.off]}>
      <Pressable onPress={onOpen} style={s.thumb}>
        <FoodThumb uri={product.fotoUrl} size={76} />
      </Pressable>
      <View style={s.info}>
        <Pressable onPress={onOpen}>
          <Text variant="label" color="textPrimary" numberOfLines={1}>
            {product.nombre}
          </Text>
          <Text variant="small" color="textSecondary" numberOfLines={2}>
            {product.descripcion}
          </Text>
        </Pressable>

        <View style={s.chips}>
          <AllergenChip alergenos={product.alergenos} />
          <AptitudeChips aptitudes={product.aptitudesDieteticas} />
          <SpiceLevel level={product.nivelPicante} />
        </View>

        {off && product.razonNoDisponible ? (
          <Text variant="small" color="warningFg" style={s.razon}>
            {product.razonNoDisponible}
          </Text>
        ) : null}

        <View style={s.footer}>
          <Price amount={product.precio} />
          {off ? (
            <Text variant="small" color="textMuted">
              No disponible
            </Text>
          ) : qty > 0 ? (
            <Stepper value={qty} min={0} onChange={onSetQty} />
          ) : (
            <Pressable onPress={onAdd} hitSlop={6} style={s.add}>
              <Icon name="plus" size={16} color={t.colors.onBrand} strokeWidth={2.6} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      gap: t.spacing[3],
      padding: t.spacing[3],
      backgroundColor: t.colors.bgSurface,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      borderRadius: t.radii.card,
    },
    off: { opacity: 0.62 },
    thumb: { flexShrink: 0 },
    info: { flex: 1, minWidth: 0, gap: t.spacing[1] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing[1] },
    razon: { fontFamily: t.fontFamily.semibold },
    footer: {
      marginTop: t.spacing[1],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    add: {
      width: 32,
      height: 32,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brandStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
