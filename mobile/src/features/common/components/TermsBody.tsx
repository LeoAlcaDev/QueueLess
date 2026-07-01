import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Text } from '@/components/ui';

interface TermsSection {
  titulo: string;
  cuerpo: string;
}

// Texto de los términos, igual que el del prototipo. Se reutiliza en la pantalla de
// términos del acceso y en la de términos de la cuenta, para que digan lo mismo.
const SECCIONES: TermsSection[] = [
  {
    titulo: '1. Pagos y reembolsos',
    cuerpo:
      'Los pagos se confirman de forma asíncrona. Si el comercio acepta el pedido, no hay reembolso automático salvo cancelación del comercio.',
  },
  {
    titulo: '2. QueuePoints',
    cuerpo:
      'Ganas 50 QueuePoints por cada entrega comunitaria completada. Son canjeables por descuentos.',
  },
  {
    titulo: '3. Datos y privacidad',
    cuerpo:
      'Tus alergias y preferencias alimentan el asistente para recomendarte platos seguros.',
  },
];

const INTRO =
  'Al usar QueueLess aceptas pre-ordenar y pagar tus pedidos en los puntos de venta del campus UTEC, recogerlos mostrando tu código QR y, si eliges entrega comunitaria, coordinar con otro estudiante repartidor.';

export function TermsBody() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={s.root}>
      <Text variant="small" color="textSecondary">
        {INTRO}
      </Text>
      {SECCIONES.map((seccion) => (
        <View key={seccion.titulo} style={s.section}>
          <Text variant="label" color="textPrimary">
            {seccion.titulo}
          </Text>
          <Text variant="small" color="textSecondary">
            {seccion.cuerpo}
          </Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[3] },
    section: { gap: t.spacing[1] },
  });
}
