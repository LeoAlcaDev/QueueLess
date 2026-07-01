import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { http, endpoints, AUTH_ENDPOINTS, SESSION_EXPIRED_EVENT, type AuthResponse } from '@/api';
import type { Rol } from '@/types/enums';
import { tokenStorage } from './tokenStorage';

export interface AuthUser {
  id: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

// lo que devuelve GET /usuarios/me
interface UsuarioResponse {
  id: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface RegisterInput {
  email: string;
  password: string;
  nombreCompleto: string;
  roles: Rol[];
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  roles: Rol[];
  // rol con el que el usuario esta navegando ahora (para el panel y el switcher)
  activeRole: Rol | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  activarRol: (rol: Rol) => Promise<void>;
  setActiveRole: (rol: Rol) => void;
  refreshUser: () => Promise<void>;
}

const ACTIVE_ROLE_KEY = 'queueless.activeRole';

export const AuthContext = createContext<AuthContextValue | null>(null);

function userFromAuth(auth: AuthResponse): AuthUser {
  return {
    id: auth.usuarioId,
    email: auth.email,
    nombreCompleto: auth.nombreCompleto,
    roles: auth.roles,
  };
}

// elige el rol activo: respeta el guardado si todavia es valido, si no toma el primero
function pickActiveRole(roles: Rol[]): Rol | null {
  if (roles.length === 0) return null;
  const saved = localStorage.getItem(ACTIVE_ROLE_KEY) as Rol | null;
  if (saved && roles.includes(saved)) return saved;
  return roles[0];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [activeRole, setActiveRoleState] = useState<Rol | null>(null);

  const applySession = useCallback((next: AuthUser) => {
    setUser(next);
    setStatus('authenticated');
    setActiveRoleState((prev) => (prev && next.roles.includes(prev) ? prev : pickActiveRole(next.roles)));
  }, []);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    setUser(null);
    setActiveRoleState(null);
    setStatus('unauthenticated');
  }, []);

  // al cargar la app: si hay tokens, traemos el usuario actual; si falla, sesion limpia
  useEffect(() => {
    let active = true;
    async function restore() {
      if (!tokenStorage.getAccess()) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const me = await http.get<UsuarioResponse>(endpoints.usuarios.me);
        if (active) applySession(me);
      } catch {
        if (active) clearSession();
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  // el interceptor avisa cuando el refresh fallo de verdad: cerramos sesion local
  useEffect(() => {
    function onExpired() {
      clearSession();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  const login = async (email: string, password: string) => {
    const auth = await http.post<AuthResponse>(AUTH_ENDPOINTS.login, { email, password });
    tokenStorage.set(auth.accessToken, auth.refreshToken);
    applySession(userFromAuth(auth));
  };

  const register = async (input: RegisterInput) => {
    const auth = await http.post<AuthResponse>(AUTH_ENDPOINTS.register, input);
    tokenStorage.set(auth.accessToken, auth.refreshToken);
    applySession(userFromAuth(auth));
  };

  const logout = () => {
    clearSession();
  };

  // activar un rol nuevo lo cambia en el backend, pero el access token actual todavia no
  // lo trae; por eso pedimos un refresh para obtener un token que ya incluya el rol.
  const activarRol = async (rol: Rol) => {
    await http.post(endpoints.usuarios.activarRol, { rol });
    const refreshToken = tokenStorage.getRefresh();
    const auth = await http.post<AuthResponse>(AUTH_ENDPOINTS.refresh, { refreshToken });
    tokenStorage.set(auth.accessToken, auth.refreshToken);
    applySession(userFromAuth(auth));
  };

  const setActiveRole = (rol: Rol) => {
    localStorage.setItem(ACTIVE_ROLE_KEY, rol);
    setActiveRoleState(rol);
  };

  const refreshUser = async () => {
    const me = await http.get<UsuarioResponse>(endpoints.usuarios.me);
    applySession(me);
  };

  const value: AuthContextValue = {
    user,
    status,
    roles: user?.roles ?? [],
    activeRole,
    login,
    register,
    logout,
    activarRol,
    setActiveRole,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
