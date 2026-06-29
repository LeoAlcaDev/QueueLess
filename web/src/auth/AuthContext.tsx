import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, usuariosApi } from "@/api";
import type { LoginRequest, RegisterRequest, Rol } from "@/types";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  onSessionCleared,
  setTokens,
} from "@/lib/storage";

/** Usuario de la sesión (normalizado entre AuthResponse y UsuarioResponse). */
export interface SessionUser {
  id: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: SessionUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  roles: Rol[];
  hasRole: (rol: Rol) => boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => void;
  /** Refresca el access token y recarga el usuario (claims/roles actualizados). */
  refreshTokens: () => Promise<void>;
  /** Activa un rol y refresca el token para que el access incluya la nueva autoridad. */
  activarRol: (rol: Rol) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  // Evita cargas concurrentes en el StrictMode doble-montaje.
  const bootstrapped = useRef(false);

  // Al montar: si hay token, validar con /usuarios/me; si falla, sesión anónima.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    if (!getAccessToken() && !getRefreshToken()) {
      setStatus("anonymous");
      return;
    }
    usuariosApi
      .getMe()
      .then((me) => {
        setUser({
          id: me.id,
          email: me.email,
          nombreCompleto: me.nombreCompleto,
          roles: me.roles,
        });
        setStatus("authenticated");
      })
      .catch(() => {
        clearTokens();
        setUser(null);
        setStatus("anonymous");
      });
  }, []);

  // La sesión se cayó desde el interceptor (refresh falló) → volver a anónimo.
  useEffect(() => {
    return onSessionCleared(() => {
      setUser(null);
      setStatus("anonymous");
    });
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const auth = await authApi.login(credentials);
    setTokens(auth.accessToken, auth.refreshToken);
    setUser({
      id: auth.usuarioId,
      email: auth.email,
      nombreCompleto: auth.nombreCompleto,
      roles: auth.roles,
    });
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (body: RegisterRequest) => {
    const auth = await authApi.register(body);
    setTokens(auth.accessToken, auth.refreshToken);
    setUser({
      id: auth.usuarioId,
      email: auth.email,
      nombreCompleto: auth.nombreCompleto,
      roles: auth.roles,
    });
    setStatus("authenticated");
  }, []);

  // logout = descartar tokens (no hay logout de servidor, MAPA §2.2).
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const refreshTokens = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("no refresh token");
    const auth = await authApi.refresh({ refreshToken });
    setTokens(auth.accessToken, auth.refreshToken);
    setUser({
      id: auth.usuarioId,
      email: auth.email,
      nombreCompleto: auth.nombreCompleto,
      roles: auth.roles,
    });
    setStatus("authenticated");
  }, []);

  const activarRol = useCallback(
    async (rol: Rol) => {
      await usuariosApi.activarRol({ rol });
      // El claim roles se fija al emitir el access: hay que refrescar (MAPA §2.4).
      await refreshTokens();
    },
    [refreshTokens],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      roles: user?.roles ?? [],
      hasRole: (rol: Rol) => !!user?.roles.includes(rol),
      login,
      register,
      logout,
      refreshTokens,
      activarRol,
    }),
    [user, status, login, register, logout, refreshTokens, activarRol],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
