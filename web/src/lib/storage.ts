// Persistencia de los tokens de sesión + aviso de "sesión caída".
// Claves acordadas en el plan: queueless.token / queueless.refresh.

const ACCESS_KEY = "queueless.token";
const REFRESH_KEY = "queueless.refresh";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

// Conjunto de suscriptores al evento "se limpió la sesión" (refresh falló).
// Lo usa AuthContext para volver al Login sin acoplar el interceptor a React.
const sessionClearedListeners = new Set<() => void>();

export function onSessionCleared(listener: () => void): () => void {
  sessionClearedListeners.add(listener);
  return () => sessionClearedListeners.delete(listener);
}

/** Borra los tokens (logout o refresh fallido) y notifica a los suscriptores. */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionClearedListeners.forEach((l) => l());
}
