import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>QueueLess</Text>
      <Text style={styles.subtitle}>App móvil — en construcción</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#15803D' },
  subtitle: { marginTop: 8, color: '#475569' },
});
