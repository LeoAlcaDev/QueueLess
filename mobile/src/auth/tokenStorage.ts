import * as SecureStore from 'expo-secure-store';
import type { Rol } from '@/api/types';

const ACCESS_KEY = 'ql.accessToken';
const REFRESH_KEY = 'ql.refreshToken';
const ACTIVE_ROLE_KEY = 'ql.activeRole';
const BIOMETRIC_KEY = 'ql.biometricEnabled';

// Los tokens viven en el keychain cifrado del dispositivo (expo-secure-store),
// nunca en AsyncStorage ni en claro. Guardamos también el rol activo para volver
// a abrir la app en el mismo rol con el que el usuario la dejó.
export const tokenStorage = {
  getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },
  async getActiveRole() {
    return (await SecureStore.getItemAsync(ACTIVE_ROLE_KEY)) as Rol | null;
  },
  setActiveRole(rol: Rol) {
    return SecureStore.setItemAsync(ACTIVE_ROLE_KEY, rol);
  },
  clearActiveRole() {
    return SecureStore.deleteItemAsync(ACTIVE_ROLE_KEY);
  },
  // preferencia de desbloqueo con biometría; es del dispositivo, así que sobrevive
  // al logout (no se borra en clear)
  async getBiometricEnabled() {
    return (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === 'true';
  },
  setBiometricEnabled(enabled: boolean) {
    return SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false');
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(ACTIVE_ROLE_KEY);
  },
  // logout explícito: si el usuario activó el desbloqueo con biometría,
  // conservamos el refresh token (sigue cifrado en el keychain) para que la
  // biometría pueda reabrir la sesión desde el login; si no lo activó, es un
  // clear completo igual que antes
  async clearForLogout() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(ACTIVE_ROLE_KEY);
    if (!(await tokenStorage.getBiometricEnabled())) {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
  },
};
