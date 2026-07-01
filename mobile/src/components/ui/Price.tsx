import { useTheme } from '@/theme/ThemeContext';
import { formatMoney } from '@/lib';
import { Text } from './Text';

export interface PriceProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  strike?: boolean;
}

const FONT_SIZES: Record<NonNullable<PriceProps['size']>, number> = {
  sm: 14,
  md: 16,
  lg: 20,
};

export function Price({ amount, size = 'md', strike = false }: PriceProps) {
  const t = useTheme();
  return (
    <Text
      color={strike ? 'textMuted' : 'textPrimary'}
      style={{
        fontFamily: t.fontFamily.bold,
        fontSize: FONT_SIZES[size],
        fontVariant: ['tabular-nums'],
        textDecorationLine: strike ? 'line-through' : 'none',
      }}
    >
      {formatMoney(amount)}
    </Text>
  );
}
