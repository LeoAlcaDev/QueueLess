import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { fontMap } from '@/theme/fonts';
import { AuthProvider, tokenStorage, useAuth } from '@/auth';
import { useBiometricAuth } from '@/hooks';
import { ErrorBoundary, ToastProvider } from '@/components/shared';
import { LockScreen } from '@/components/shared/LockScreen';
import { RootNavigator, navigationRef } from '@/navigation';

// Mientras cargan las fuentes todavía no hay providers, así que el gate usa el naranja
// de marca directo (mismo del splash de app.json) en lugar de un token del tema.
function LoadingGate() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F97316' }}>
      <ActivityIndicator color="#FFFFFF" size="large" />
    </View>
  );
}

// Decide si hay que pedir biometría antes de entrar: si la sesión está activa, el
// usuario activó el desbloqueo y el equipo lo soporta, mostramos el LockScreen.
function AppGate() {
  const { status, logout } = useAuth();
  const { available, checking } = useBiometricAuth();
  const [requiereBiometria, setRequiereBiometria] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (status === 'authenticated') {
        const habilitada = await tokenStorage.getBiometricEnabled();
        if (active) {
          setRequiereBiometria(habilitada);
          setBloqueado(habilitada);
        }
      } else if (active) {
        setRequiereBiometria(false);
        setBloqueado(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status]);

  const debeBloquear = status === 'authenticated' && requiereBiometria && bloqueado && available && !checking;

  if (debeBloquear) {
    return <LockScreen onUnlock={() => setBloqueado(false)} onUsePassword={() => logout()} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(fontMap);

  if (!fontsLoaded) {
    return <LoadingGate />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {/* el tema va por fuera del límite de error a propósito: la pantalla de
            "algo salió mal" usa tokens del tema, así que necesita el provider
            por encima para no reventar justo cuando intenta mostrarse */}
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <AppGate />
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
