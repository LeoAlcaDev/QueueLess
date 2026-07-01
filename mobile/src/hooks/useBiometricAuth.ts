import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricState {
  available: boolean; // hay hardware Y biometría registrada
  checking: boolean;
}

// Atajo de login con huella o Face ID cuando ya hay una sesión guardada. Solo se
// ofrece si el equipo tiene el sensor y el usuario tiene biometría registrada; si
// no, la pantalla cae al login con contraseña.
export function useBiometricAuth() {
  const [state, setState] = useState<BiometricState>({ available: false, checking: true });

  useEffect(() => {
    let active = true;
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (active) setState({ available: hasHardware && enrolled, checking: false });
    })();
    return () => {
      active = false;
    };
  }, []);

  const authenticate = useCallback(async (promptMessage: string): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
    });
    return result.success;
  }, []);

  return { ...state, authenticate };
}
