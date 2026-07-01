import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface TextAreaProps {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  numberOfLines?: number;
  maxLength?: number;
  error?: string;
  helperText?: string;
}

export function TextArea({
  label,
  value,
  onChangeText,
  placeholder,
  numberOfLines = 3,
  maxLength,
  error,
  helperText,
}: TextAreaProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? t.colors.errorDot
    : focused
      ? t.colors.borderFocus
      : t.colors.borderDefault;

  // altura mínima según las líneas pedidas (cada línea ~22px) más el padding vertical
  const minHeight = numberOfLines * 22 + t.spacing[4];

  return (
    <View style={s.root}>
      {label ? (
        <Text variant="label" style={s.label}>
          {label}
        </Text>
      ) : null}

      <View style={[s.box, { borderColor }]}>
        <TextInput
          style={[s.input, { minHeight }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textMuted}
          maxLength={maxLength}
          multiline
          textAlignVertical="top"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>

      <View style={s.footer}>
        {error ? (
          <View style={s.helperRow}>
            <Icon name="alertCircle" size={14} color={t.colors.errorFg} />
            <Text variant="small" color="errorFg">
              {error}
            </Text>
          </View>
        ) : helperText ? (
          <Text variant="small" color="textMuted">
            {helperText}
          </Text>
        ) : (
          <View />
        )}
        {maxLength ? (
          <Text variant="small" color="textMuted">
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[1] },
    label: { color: t.colors.textPrimary },
    box: {
      borderWidth: 1,
      borderRadius: t.radii.input,
      backgroundColor: t.colors.bgSurface,
      paddingHorizontal: t.spacing[3],
      paddingVertical: t.spacing[2],
    },
    input: {
      fontFamily: t.fontFamily.regular,
      fontSize: 16,
      color: t.colors.textPrimary,
    },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    helperRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] },
  });
}
