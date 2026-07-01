import { tokenStorage } from '@/auth/tokenStorage';

type SessionListener = () => void;
let sessionExpiredListener: SessionListener | null = null;

// Puente entre la capa axios y el AuthContext. El cliente necesita leer y rotar
// tokens y avisar cuando la sesión expira, pero no puede importar un provider de
// React; por eso pasa por acá. El guardado real lo hace tokenStorage, y el aviso
// de expiración lo escucha el AuthContext para mandar de vuelta al login.
export const authBridge = {
  getAccessToken: () => tokenStorage.getAccessToken(),
  getRefreshToken: () => tokenStorage.getRefreshToken(),
  setTokens: (accessToken: string, refreshToken: string) => tokenStorage.setTokens(accessToken, refreshToken),
  clear: () => tokenStorage.clear(),
  onSessionExpired(cb: SessionListener) {
    sessionExpiredListener = cb;
    return () => {
      if (sessionExpiredListener === cb) sessionExpiredListener = null;
    };
  },
  emitSessionExpired() {
    sessionExpiredListener?.();
  },
};
