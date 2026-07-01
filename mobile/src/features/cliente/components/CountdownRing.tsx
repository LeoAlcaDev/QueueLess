import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import type { Palette, Theme } from '@/theme';
import { Text } from '@/components';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingColor = 'brand' | 'points' | 'info' | 'warning';

export interface CountdownRingProps {
  color?: RingColor;
  totalSecs?: number;
  label?: string;
  size?: number;
}

interface RingPalette {
  stroke: keyof Palette;
  soft: keyof Palette;
  text: keyof Palette;
}

const PALETTES: Record<RingColor, RingPalette> = {
  brand: { stroke: 'brandStrong', soft: 'brandSoft', text: 'textBrand' },
  points: { stroke: 'points', soft: 'pointsSoft', text: 'pointsStrong' },
  info: { stroke: 'infoDot', soft: 'infoBg', text: 'infoFg' },
  warning: { stroke: 'warningDot', soft: 'warningBg', text: 'warningFg' },
};

// Anillo de cuenta regresiva. El progreso anima de forma lineal (sin easing): la
// espera es una estimación, no una animación con rebote. El conteo real lo manda el
// backend por SSE; acá solo damos sensación de avance mientras se espera.
export function CountdownRing({ color = 'brand', totalSecs = 240, label, size = 184 }: CountdownRingProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const pal = PALETTES[color];

  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(1)).current;
  const [secs, setSecs] = useState(totalSecs);

  useEffect(() => {
    progress.setValue(1);
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: totalSecs * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, totalSecs]);

  useEffect(() => {
    setSecs(totalSecs);
    const id = setInterval(() => setSecs((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [totalSecs]);

  // progress 1 → anillo lleno (offset 0); progress 0 → anillo vacío (offset = circunferencia)
  const dashoffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });
  const minutos = Math.floor(secs / 60);
  const segundos = secs % 60;

  return (
    <View style={s.root}>
      <View style={{ width: size, height: size }}>
        <View style={s.svgWrap}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={t.colors[pal.soft]}
              strokeWidth={11}
            />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={t.colors[pal.stroke]}
              strokeWidth={11}
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <View style={s.center}>
          <Text variant="display" color={pal.text} style={[s.time, { fontSize: size * 0.19 }]}>
            {`${minutos}:${String(segundos).padStart(2, '0')}`}
          </Text>
          <Text variant="small" color="textMuted">
            restantes
          </Text>
        </View>
      </View>
      {label ? (
        <Text variant="small" color="textSecondary" align="center" style={s.label}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { alignItems: 'center', gap: t.spacing[3] },
    // arrancamos el trazo desde arriba, como un reloj
    svgWrap: { ...StyleSheet.absoluteFillObject, transform: [{ rotate: '-90deg' }] },
    center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    time: { fontVariant: ['tabular-nums'] },
    label: { maxWidth: 280 },
  });
}
