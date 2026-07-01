import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  prefix?: string;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize,
  editable = true,
  leftIcon,
  rightIcon,
  prefix,
  onBlur,
  autoFocus,
}: FieldProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const isSecure = secureTextEntry && hidden;
  const borderColor = error
    ? t.colors.errorDot
    : focused
      ? t.colors.borderFocus
      : t.colors.borderDefault;

  return (
    <View style={s.root}>
      {label ? (
        <Text variant="label" style={s.label}>
          {label}
        </Text>
      ) : null}

      <View style={[s.inputRow, { borderColor }, !editable && s.disabled]}>
        {leftIcon ? <Icon name={leftIcon} size={18} color={t.colors.textMuted} /> : null}
        {prefix ? (
          <Text variant="body" color="textSecondary">
            {prefix}
          </Text>
        ) : null}
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.colors.textMuted}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((prev) => !prev)} hitSlop={8}>
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={18} color={t.colors.textMuted} />
          </Pressable>
        ) : rightIcon ? (
          <Icon name={rightIcon} size={18} color={t.colors.textMuted} />
        ) : null}
      </View>

      {error ? (
        <View style={s.helperRow}>
          <Icon name="alertCircle" size={14} color={t.colors.errorFg} />
          <Text variant="small" color="errorFg">
            {error}
          </Text>
        </View>
      ) : helperText ? (
        <Text variant="small" color="textMuted" style={s.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { gap: t.spacing[1] },
    label: { color: t.colors.textPrimary },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[2],
      minHeight: 48,
      paddingHorizontal: t.spacing[3],
      borderWidth: 1,
      borderRadius: t.radii.input,
      backgroundColor: t.colors.bgSurface,
    },
    disabled: { backgroundColor: t.colors.bgSurface2 },
    input: {
      flex: 1,
      paddingVertical: t.spacing[2],
      fontFamily: t.fontFamily.regular,
      fontSize: 16,
      color: t.colors.textPrimary,
    },
    helperRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] },
    helper: { marginLeft: 2 },
  });
}
