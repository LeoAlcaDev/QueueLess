import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { Text } from '@/components/ui';

export interface BrandMarkProps {
  size?: number;
  // color del trazo; por defecto el naranja de marca, pero sobre el hero naranja
  // le pasamos el blanco (onBrand) para que contraste
  color?: string;
}

// La marca de QueueLess: la "Q" como anillo y su cola convertida en relámpago
// (cola + velocidad). Se dibuja con react-native-svg para que escale sin pixelarse.
export function BrandMark({ size = 28, color }: BrandMarkProps) {
  const t = useTheme();
  const stroke = color ?? t.colors.brand;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx={28} cy={28} r={20} stroke={stroke} strokeWidth={5} fill="none" />
      <Path
        d="M40 36 L34 48 L42 48 L36 60 L52 44 L44 44 L50 36 Z"
        fill={stroke}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface BrandWordmarkProps {
  size?: number;
  color?: string;
  // color del texto "QueueLess"; si no se pasa, sigue al de la marca
  textColor?: string;
}

// La marca junto al texto "QueueLess", para cabeceras y la landing.
export function BrandWordmark({ size = 28, color, textColor }: BrandWordmarkProps) {
  const s = makeStyles();
  return (
    <View style={s.row}>
      <BrandMark size={size} color={color} />
      <Text variant="h2" style={textColor ? { color: textColor } : undefined}>
        QueueLess
      </Text>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  });
}
