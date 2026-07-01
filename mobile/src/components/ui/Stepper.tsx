import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

export function Stepper({ value, onChange, min = 0, max }: StepperProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  function decrease() {
    if (canDecrease) onChange(value - 1);
  }
  function increase() {
    if (canIncrease) onChange(value + 1);
  }

  return (
    <View style={s.root}>
      <Pressable onPress={decrease} disabled={!canDecrease} style={[s.button, !canDecrease && s.buttonDisabled]}>
        <Icon name="minus" size={18} color={t.colors.textPrimary} />
      </Pressable>
      <Text variant="h3" style={s.value}>
        {value}
      </Text>
      <Pressable onPress={increase} disabled={!canIncrease} style={[s.button, !canIncrease && s.buttonDisabled]}>
        <Icon name="plus" size={18} color={t.colors.textPrimary} />
      </Pressable>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    button: {
      width: 36,
      height: 36,
      borderRadius: t.radii.pill,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.bgSurface,
    },
    buttonDisabled: { opacity: 0.4 },
    value: { minWidth: 32, textAlign: 'center', fontVariant: ['tabular-nums'] },
  });
}
