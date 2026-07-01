import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { Text } from './Text';

export interface LoadMoreProps {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  endLabel?: string;
}

export function LoadMore({ loading, hasMore, onLoadMore, endLabel }: LoadMoreProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={s.root}>
      {loading ? (
        <Spinner />
      ) : hasMore ? (
        <Button title="Cargar más" variant="outline" size="sm" onPress={onLoadMore} />
      ) : endLabel ? (
        <Text variant="small" color="textMuted">
          {endLabel}
        </Text>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    root: { alignItems: 'center', justifyContent: 'center', paddingVertical: t.spacing[4] },
  });
}
