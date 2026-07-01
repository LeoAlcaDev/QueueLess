import { lazy, Suspense, type ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Spinner } from '@/components/ui';

// El catálogo público se ve sin sesión, así que estas rutas son de nivel raíz: no cuelgan del
// AppShell ni pasan por PrivateRoute. Cada pantalla va en su propio chunk con React.lazy.
const Explorar = lazy(() => import('./pages/Explorar'));
const ExplorarLocal = lazy(() => import('./pages/ExplorarLocal'));

// Cada ruta trae su propio Suspense porque se monta en la raíz del router, fuera del AppShell,
// que es quien aporta el suyo alrededor del Outlet en las áreas con sesión.
function FullPage({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-page text-brand">
          <Spinner size={28} />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const publicoRoutes: RouteObject[] = [
  { path: '/explorar', element: <FullPage><Explorar /></FullPage> },
  { path: '/explorar/locales/:id', element: <FullPage><ExplorarLocal /></FullPage> },
];
