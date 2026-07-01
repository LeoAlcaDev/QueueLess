import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  sub?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, sub, disabled = false }: CheckboxProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      style={[s.root, disabled && s.disabled]}
    >
      <View style={[s.box, checked && s.boxChecked]}>
        {checked ? <Icon name="check" size={14} color={t.colors.onBrand} strokeWidth={3} /> : null}
      </View>
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
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] },
    disabled: { opacity: 0.45 },
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: t.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.bgSurface,
    },
    boxChecked: { backgroundColor: t.colors.brandStrong, borderColor: t.colors.brandStrong },
    texts: { flex: 1, gap: 2 },
  });
}
