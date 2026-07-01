import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { PICANTE_LABELS, PREPARACION_LABELS } from '@/lib';
import type { ProductoResponse } from '@/api';
import {
  AllergenChip,
  AptitudeChips,
  Button,
  Chip,
  ConfirmDialog,
  FoodThumb,
  Icon,
  Screen,
  StateBanner,
  Stepper,
  Text,
} from '@/components';
import { TopBar } from '../components';
import { useCart } from '../cart/CartContext';

export function ProductoDetalleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const product: ProductoResponse = route.params?.producto;
  const punto: { id: number; nombre: string } = route.params?.punto;
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const cart = useCart();

  const [qty, setQty] = useState(1);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const off = !product.disponibleAhora;

  function commitAdd() {
    cart.add(
      { id: punto.id, nombre: punto.nombre },
      { productoId: product.id, nombre: product.nombre, precio: product.precio, fotoUrl: product.fotoUrl },
      qty,
    );
    navigation.navigate('Checkout');
  }

  function handleAdd() {
    if (cart.belongsToOtherPunto(punto.id)) {
      setConfirmReplace(true);
      return;
    }
    commitAdd();
  }

  const cta = (
    <Button
      title={`Agregar al pedido · S/ ${(product.precio * qty).toFixed(2)}`}
      onPress={handleAdd}
      disabled={off}
      fullWidth
    />
  );

  return (
    <Screen
      scroll
      padded={false}
      header={<TopBar title="Producto" onBack={() => navigation.goBack()} />}
      footer={cta}
    >
      <View style={s.content}>
        <FoodThumb uri={product.fotoUrl} hero radius={t.radii.modal} />

        <View>
          <Text variant="h2">{product.nombre}</Text>
          <View style={s.vendor}>
            <Icon name="store" size={13} color={t.colors.textMuted} />
            <Text variant="small" color="textMuted">
              {punto.nombre}
            </Text>
          </View>
        </View>

        <Text variant="body" color="textSecondary">
          {product.descripcion}
        </Text>

        <View style={s.chips}>
          <AllergenChip alergenos={product.alergenos} />
          <AptitudeChips aptitudes={product.aptitudesDieteticas} />
          {product.nivelPicante !== 'NINGUNA' ? (
            <Chip label={PICANTE_LABELS[product.nivelPicante]} tone="error" icon="flame" />
          ) : null}
          <Chip label={PREPARACION_LABELS[product.tipoPreparacion]} tone="neutral" />
        </View>

        {off && product.razonNoDisponible ? (
          <StateBanner tone="warning" title="No disponible ahora" message={product.razonNoDisponible} />
        ) : null}

        <View style={s.qtyRow}>
          <Text variant="label" color="textSecondary">
            Cantidad
          </Text>
          <Stepper value={qty} min={1} onChange={setQty} />
        </View>
      </View>

      <ConfirmDialog
        visible={confirmReplace}
        title="¿Vaciar tu carrito?"
        message="Tu carrito tiene productos de otro local. Para pedir de aquí, vaciaremos lo anterior."
        confirmLabel="Vaciar y agregar"
        cancelLabel="Conservar"
        destructive
        onConfirm={() => {
          cart.clear();
          setConfirmReplace(false);
          commitAdd();
        }}
        onCancel={() => setConfirmReplace(false)}
      />
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { padding: t.spacing[4], gap: t.spacing[4] },
    vendor: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1], marginTop: t.spacing[1] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing[2] },
    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: t.colors.borderDefault,
      paddingTop: t.spacing[4],
    },
  });
}
