import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

interface ChipOption {
  label: string;
  value: string;
}

export interface ChipMultiSelectProps {
  options: ChipOption[];
  values: string[];
  onChange: (v: string[]) => void;
  columns?: number;
}

const GAP = 8;

export function ChipMultiSelect({ options, values, onChange, columns }: ChipMultiSelectProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [containerWidth, setContainerWidth] = useState(0);

  // con columnas fijas el ancho de cada chip sale de medir el contenedor
  const itemWidth =
    columns && columns > 0 && containerWidth > 0
      ? (containerWidth - GAP * (columns - 1)) / columns
      : undefined;

  function onLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((current) => current !== value));
    } else {
      onChange([...values, value]);
    }
  }

  return (
    <View style={s.wrap} onLayout={onLayout}>
      {options.map((option) => {
        const isSelected = values.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => toggle(option.value)}
            style={[s.chip, isSelected ? s.chipSelected : s.chipIdle, itemWidth ? { width: itemWidth } : null]}
          >
            {isSelected ? <Icon name="check" size={14} color={t.colors.brand} strokeWidth={3} /> : null}
            <Text variant="label" color={isSelected ? 'textBrand' : 'textSecondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing[1],
      paddingVertical: t.spacing[2],
      paddingHorizontal: t.spacing[3],
      borderRadius: t.radii.pill,
      borderWidth: 1,
    },
    chipIdle: { backgroundColor: t.colors.bgSurface, borderColor: t.colors.borderDefault },
    chipSelected: { backgroundColor: t.colors.brandSoft, borderColor: t.colors.brand },
  });
}
