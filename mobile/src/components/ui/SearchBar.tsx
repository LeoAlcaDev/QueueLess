import { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

export interface SearchBarProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onClear?: () => void;
  loading?: boolean;
}

export function SearchBar({ value, onChangeText, placeholder = 'Buscar', onClear, loading = false }: SearchBarProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  function clear() {
    if (onClear) onClear();
    else onChangeText('');
  }

  return (
    <View style={s.root}>
      <Icon name="search" size={18} color={t.colors.textMuted} />
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        returnKeyType="search"
      />
      {loading ? (
        <Spinner size="sm" color="textMuted" />
      ) : value.length > 0 ? (
        <Pressable onPress={clear} hitSlop={8}>
          <Icon name="x" size={18} color={t.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[2],
      minHeight: 46,
      paddingHorizontal: t.spacing[3],
      borderRadius: t.radii.input,
      borderWidth: 1,
      borderColor: t.colors.borderDefault,
      backgroundColor: t.colors.bgSurface,
    },
    input: {
      flex: 1,
      paddingVertical: t.spacing[2],
      fontFamily: t.fontFamily.regular,
      fontSize: 16,
      color: t.colors.textPrimary,
    },
  });
}
