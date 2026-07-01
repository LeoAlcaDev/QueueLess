import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { Modal } from './Modal';

interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string | null;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = 'Selecciona una opción',
  error,
  disabled = false,
}: SelectProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);
  const borderColor = error ? t.colors.errorDot : t.colors.borderDefault;

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <View style={s.root}>
      {label ? (
        <Text variant="label" style={s.label}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[s.trigger, { borderColor }, disabled && s.disabled]}
      >
        <Text variant="body" color={selected ? 'textPrimary' : 'textMuted'} style={s.triggerText}>
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="chevronDown" size={18} color={t.colors.textMuted} />
      </Pressable>

      {error ? (
        <View style={s.helperRow}>
          <Icon name="alertCircle" size={14} color={t.colors.errorFg} />
          <Text variant="small" color="errorFg">
            {error}
          </Text>
        </View>
      ) : null}

      <Modal visible={open} onClose={() => setOpen(false)} title={label ?? 'Selecciona'} sheet>
        <View style={s.options}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable key={option.value} onPress={() => pick(option.value)} style={s.option}>
                <Text variant="body" color={isSelected ? 'textBrand' : 'textPrimary'}>
                  {option.label}
                </Text>
                {isSelected ? <Icon name="check" size={18} color={t.colors.brand} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[1] },
    label: { color: t.colors.textPrimary },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.spacing[2],
      minHeight: 48,
      paddingHorizontal: t.spacing[3],
      borderWidth: 1,
      borderRadius: t.radii.input,
      backgroundColor: t.colors.bgSurface,
    },
    triggerText: { flex: 1 },
    disabled: { backgroundColor: t.colors.bgSurface2 },
    helperRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] },
    options: { gap: t.spacing[1] },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: t.spacing[3],
      paddingHorizontal: t.spacing[2],
      borderRadius: t.radii.input,
    },
  });
}
