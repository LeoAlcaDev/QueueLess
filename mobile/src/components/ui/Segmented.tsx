import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Text } from './Text';

interface SegmentOption {
  label: string;
  value: string;
}

export interface SegmentedProps {
  options: SegmentOption[];
  value: string;
  onChange: (v: string) => void;
  fullWidth?: boolean;
}

export function Segmented({ options, value, onChange, fullWidth = false }: SegmentedProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={[s.track, fullWidth && s.fullWidth]}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[s.segment, fullWidth && s.segmentFull, isActive && s.segmentActive]}
          >
            <Text variant="label" color={isActive ? 'textPrimary' : 'textSecondary'}>
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
    track: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      backgroundColor: t.colors.bgSurface2,
      borderRadius: t.radii.button,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      padding: 3,
      gap: 2,
    },
    fullWidth: { alignSelf: 'stretch' },
    segment: {
      paddingVertical: t.spacing[2],
      paddingHorizontal: t.spacing[4],
      borderRadius: t.radii.button - 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentFull: { flex: 1 },
    segmentActive: { backgroundColor: t.colors.bgSurface, ...t.shadow.sm },
  });
}
