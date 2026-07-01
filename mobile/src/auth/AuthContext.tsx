import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, authBridge, endpoints, forceRefresh, unwrap } from '@/api';
import type { ApiResponse, AuthResponse, RegisterRequest, Rol, UsuarioResponse } from '@/api/types';
import { tokenStorage } from './tokenStorage';
import { defaultRole } from './roles';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthUser {
  usuarioId: number;
  email: string;
  nombreCompleto: string;
  roles: Rol[];
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  roles: Rol[];
  activeRole: Rol | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  switchRole: (rol: Rol) => Promise<void>;
  clearActiveRole: () => Promise<void>;
  activarRol: (rol: Rol) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<Rol | null>(null);

  const applySession = useCallback(async (nextUser: AuthUser, preferRole?: Rol) => {
    setUser(nextUser);
    // conservamos el rol activo si sigue siendo válido; si no, el preferido, el
    // guardado, o el default cuando hay uno solo
    const stored = await tokenStorage.getActiveRole();
    const candidate =
      preferRole && nextUser.roles.includes(preferRole)
        ? preferRole
        : stored && nextUser.roles.includes(stored)
          ? stored
          : defaultRole(nextUser.roles);
    if (candidate) await tokenStorage.setActiveRole(candidate);
    setActiveRoleState(candidate);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    setActiveRoleState(null);
    setStatus('unauthenticated');
  }, []);

  const fetchMe = useCallback(async (): Promise<AuthUser> => {
    const me = unwrap(await api.get<ApiResponse<UsuarioResponse>>(endpoints.usuarios.me()));
    return { usuarioId: me.id, email: me.email, nombreCompleto: me.nombreCompleto, roles: me.roles };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = unwrap(await api.post<ApiResponse<AuthResponse>>(endpoints.auth.login(), { email, password }));
      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
      await applySession({ usuarioId: data.usuarioId, email: data.email, nombreCompleto: data.nombreCompleto, roles: data.roles });
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const data = unwrap(await api.post<ApiResponse<AuthResponse>>(endpoints.auth.register(), payload));
      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
      await applySession({ usuarioId: data.usuarioId, email: data.email, nombreCompleto: data.nombreCompleto, roles: data.roles });
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    await tokenStorage.clearForLogout();
    setUser(null);
    setActiveRoleState(null);
    setStatus('unauthenticated');
  }, []);

  const refresh = useCallback(async () => {
    const token = await forceRefresh();
    if (!token) {
      await clearSession();
      throw new Error('No se pudo refrescar la sesión');
    }
    await applySession(await fetchMe());
  }, [applySession, clearSession, fetchMe]);

  const switchRole = useCallback(async (rol: Rol) => {
    await tokenStorage.setActiveRole(rol);
    setActiveRoleState(rol);
  }, []);

  // vuelve al selector de rol: soltamos el rol activo (en memoria y en el keychain) para
  // que el gate de navegación muestre otra vez la elección de rol
  const clearActiveRole = useCallback(async () => {
    await tokenStorage.clearActiveRole();
    setActiveRoleState(null);
  }, []);

  const activarRol = useCallback(
    async (rol: Rol) => {
      await api.post(endpoints.usuarios.activarRol(), { rol });
      // activar un rol no reemite el token, así que refrescamos para que el rol
      // nuevo entre al access; recién entonces lo dejamos como activo
      await refresh();
      await switchRole(rol);
    },
    [refresh, switchRole],
  );

  const restoreSession = useCallback(async () => {
    const access = await tokenStorage.getAccessToken();
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!access && !refreshToken) {
      setStatus('unauthenticated');
      return;
    }
    try {
      // si el access venció, el interceptor lo refresca solo al pedir /me; si el
      // refresh tampoco sirve, /me falla y limpiamos
      await applySession(await fetchMe());
    } catch {
      await clearSession();
    }
  }, [applySession, clearSession, fetchMe]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // el interceptor avisa cuando un refresh falló de raíz: volvemos al login
  useEffect(() => {
    return authBridge.onSessionExpired(() => {
      setUser(null);
      setActiveRoleState(null);
      setStatus('unauthenticated');
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      roles: user?.roles ?? [],
      activeRole,
      login,
      register,
      logout,
      refresh,
      switchRole,
      clearActiveRole,
      activarRol,
    }),
    [status, user, activeRole, login, register, logout, refresh, switchRole, clearActiveRole, activarRol],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
