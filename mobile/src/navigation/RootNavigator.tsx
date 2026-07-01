import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/auth';
import { useTheme } from '@/theme/ThemeContext';
import { AuthNavigator } from '@/features/auth/navigation/AuthNavigator';
import { ClienteNavigator } from '@/features/cliente/navigation/ClienteNavigator';
import { ComercioNavigator } from '@/features/comercio/navigation/ComercioNavigator';
import { RepartidorNavigator } from '@/features/repartidor/navigation/RepartidorNavigator';
import {
  PerfilClienteScreen,
  PerfilComercioScreen,
  PerfilRepartidorScreen,
  ReclamosScreen,
  RoleSelectScreen,
  SettingsScreen,
  TycScreen,
} from '@/features/common/screens';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Gate por sesión y rol activo: sin sesión va al stack de acceso; con sesión pero
// sin rol elegido, al selector; con rol, a sus tabs. Las pantallas de cuenta quedan
// registradas a nivel raíz para alcanzarlas desde cualquier rol por nombre.
export function RootNavigator() {
  const { status, activeRole } = useAuth();
  const { colors } = useTheme();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPage }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === 'unauthenticated' ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : activeRole == null ? (
        // sesión iniciada pero sin rol elegido: mostramos solo el selector. Al elegir un
        // rol, activeRole deja de ser null y este grupo desaparece; React Navigation nota
        // que la pantalla actual ya no existe y entra sola al panel del rol, sin depender
        // de un remount manual del navegador (que en native-stack no era confiable).
        <Stack.Group>
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="Tyc" component={TycScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          {activeRole === 'CLIENTE' && <Stack.Screen name="Main" component={ClienteNavigator} />}
          {activeRole === 'COMERCIO' && <Stack.Screen name="Main" component={ComercioNavigator} />}
          {activeRole === 'REPARTIDOR' && <Stack.Screen name="Main" component={RepartidorNavigator} />}
          <Stack.Screen name="Tyc" component={TycScreen} />
          <Stack.Screen name="PerfilCliente" component={PerfilClienteScreen} />
          <Stack.Screen name="PerfilComercio" component={PerfilComercioScreen} />
          <Stack.Screen name="PerfilRepartidor" component={PerfilRepartidorScreen} />
          <Stack.Screen name="Reclamos" component={ReclamosScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
