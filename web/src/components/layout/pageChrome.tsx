import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

export interface PageChrome {
  path: string;
  title: string;
  sub?: string;
  maxWidth?: number;
}

interface PageChromeContextValue {
  chrome: PageChrome | null;
  setChrome: (chrome: PageChrome) => void;
  actionsHost: HTMLElement | null;
  setActionsHost: (el: HTMLElement | null) => void;
}

export const PageChromeContext = createContext<PageChromeContextValue | null>(null);

// Cada pantalla declara su titulo (y opcional subtitulo y ancho de contenido) para la
// topbar del shell. Lo atamos a la ruta para que no quede un titulo viejo si la siguiente
// pantalla no lo declara.
export function usePageChrome(title: string, opts?: { sub?: string; maxWidth?: number }): void {
  const ctx = useContext(PageChromeContext);
  const location = useLocation();
  const sub = opts?.sub;
  const maxWidth = opts?.maxWidth;
  useEffect(() => {
    ctx?.setChrome({ path: location.pathname, title, sub, maxWidth });
  }, [ctx, location.pathname, title, sub, maxWidth]);
}

// Acciones contextuales de la pantalla: se pintan a la derecha de la topbar via portal.
// Al desmontar la pantalla, React limpia el portal solo.
export function PageActions({ children }: { children: ReactNode }) {
  const ctx = useContext(PageChromeContext);
  if (!ctx?.actionsHost) return null;
  return createPortal(children, ctx.actionsHost);
}
