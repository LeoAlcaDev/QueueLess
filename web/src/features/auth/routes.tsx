import { lazy, Suspense, type ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Spinner } from '@/components/ui';

// Las pantallas de acceso son rutas de pantalla completa (van sin el AppShell). Cada una se
// carga por separado con React.lazy para que entren en su propio chunk del bundle.
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Account = lazy(() => import('./pages/Account'));
const Reclamos = lazy(() => import('./pages/Reclamos'));

// Cada ruta vive en su propio Suspense porque estas rutas se montan en la raíz del router,
// fuera del AppShell, que es quien aporta el suyo para las áreas con sesión.
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

export const authRoutes: RouteObject[] = [
  { path: '/', element: <FullPage><Landing /></FullPage> },
  { path: '/login', element: <FullPage><Login /></FullPage> },
  { path: '/register', element: <FullPage><Register /></FullPage> },
  { path: '/cuenta', element: <FullPage><Account /></FullPage> },
  { path: '/cuenta/reclamos', element: <FullPage><Reclamos /></FullPage> },
];
