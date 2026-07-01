import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegistroScreen } from '../screens/RegistroScreen';
import { TerminosScreen } from '../screens/TerminosScreen';

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Registro: undefined;
  Terminos: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

// Stack del acceso (no autenticado): bienvenida, ingreso, alta de cuenta y términos.
// Cada pantalla dibuja su propia cabecera, así que el header del stack va apagado.
export function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Landing" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registro" component={RegistroScreen} />
      <Stack.Screen name="Terminos" component={TerminosScreen} />
    </Stack.Navigator>
  );
}
