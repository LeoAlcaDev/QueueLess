import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Text } from './Text';

export interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label?: string;
  sub?: string;
  disabled?: boolean;
}

const TRACK_WIDTH = 48;
const THUMB_SIZE = 22;
const TRACK_PADDING = 3;

export function Toggle({ value, onValueChange, label, sub, disabled = false }: ToggleProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [value, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2],
  });
  // el track pasa a brandStrong cuando está activo
  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [t.colors.bgSurface2, t.colors.brandStrong],
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      style={[s.root, disabled && s.disabled]}
    >
      {label || sub ? (
        <View style={s.texts}>
          {label ? <Text variant="body">{label}</Text> : null}
          {sub ? (
            <Text variant="small" color="textSecondary">
              {sub}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Animated.View style={[s.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[s.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    disabled: { opacity: 0.45 },
    texts: { flex: 1, gap: 2 },
    track: {
      width: TRACK_WIDTH,
      height: THUMB_SIZE + TRACK_PADDING * 2,
      borderRadius: t.radii.pill,
      padding: TRACK_PADDING,
      justifyContent: 'center',
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.onBrand,
      ...t.shadow.sm,
    },
  });
}
