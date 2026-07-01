// ============================================================================
// QueueLess — useTheme + ThemeContext (React Native)
//   src/theme/ThemeContext.tsx
// ----------------------------------------------------------------------------
// Conmuta light/dark por useColorScheme() del sistema, con override manual
// opcional persistido en SecureStore (la app es naranja en ambos modos).
// Envuelve la app con <ThemeProvider> una sola vez (encima del NavigationContainer).
// ============================================================================
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { buildTheme, type Theme } from './index';

type Mode = 'light' | 'dark' | 'system';
type Ctx = { theme: Theme; mode: Mode; setMode: (m: Mode) => void };

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() ?? 'light';
  const [mode, setMode] = useState<Mode>('system');
  const resolved = mode === 'system' ? system : mode;
  const theme = useMemo(() => buildTheme(resolved === 'dark' ? 'dark' : 'light'), [resolved]);
  const value = useMemo<Ctx>(() => ({ theme, mode, setMode }), [theme, mode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx.theme;
}

export function useThemeMode() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useThemeMode debe usarse dentro de <ThemeProvider>');
  return { mode: ctx.mode, setMode: useCallback(ctx.setMode, [ctx.setMode]) };
}
