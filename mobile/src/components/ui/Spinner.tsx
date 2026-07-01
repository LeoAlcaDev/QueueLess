import { ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Palette } from '@/theme';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: keyof Palette;
}

const SIZES: Record<NonNullable<SpinnerProps['size']>, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

export function Spinner({ size = 'md', color = 'brand' }: SpinnerProps) {
  const t = useTheme();
  return <ActivityIndicator size={SIZES[size]} color={t.colors[color]} />;
}
