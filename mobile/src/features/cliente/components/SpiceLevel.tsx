import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { ToleranciaPicante } from '@/api';
import { Icon } from '@/components';

const NIVEL: Record<ToleranciaPicante, number> = { NINGUNA: 0, BAJA: 1, MEDIA: 2, ALTA: 3 };

// Tres llamas que se encienden según el nivel de picante; nada para "NINGUNA".
export function SpiceLevel({ level }: { level: ToleranciaPicante }) {
  const t = useTheme();
  const activos = NIVEL[level] ?? 0;
  if (activos === 0) return null;
  return (
    <View style={styles.row}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ opacity: i <= activos ? 1 : 0.22 }}>
          <Icon name="flame" size={14} color={t.colors.errorDot} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 1 },
});
