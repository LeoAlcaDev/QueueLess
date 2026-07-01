import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { starColor } from '@/lib';
import { Icon } from './Icon';

export interface StarsProps {
  value: number;
  size?: number;
  editable?: boolean;
  onChange?: (n: number) => void;
}

const POSITIONS = [1, 2, 3, 4, 5];

export function Stars({ value, size = 16, editable = false, onChange }: StarsProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const rounded = Math.round(value);
  const filledColor = starColor(t.colors);

  return (
    <View style={s.row}>
      {POSITIONS.map((position) => {
        const filled = position <= rounded;
        const star = (
          <Icon
            name="star"
            size={size}
            color={filled ? filledColor : t.colors.borderStrong}
            strokeWidth={filled ? 2.5 : 2}
          />
        );
        if (editable) {
          return (
            <Pressable key={position} onPress={() => onChange?.(position)} hitSlop={4}>
              {star}
            </Pressable>
          );
        }
        return <View key={position}>{star}</View>;
      })}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: t.spacing[1], alignSelf: 'flex-start' },
  });
}
