import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout';
import { NotFound } from '@/features/common';
import { Spinner } from '@/components/ui';
import { authRoutes } from '@/features/auth/routes';
import { publicoRoutes } from '@/features/publico/routes';
import { clienteRoutes } from '@/features/cliente/routes';
import { comercioRoutes } from '@/features/comercio/routes';
import { repartidorRoutes } from '@/features/repartidor/routes';
import { PrivateRoute } from './PrivateRoute';

// El catalogo de componentes es solo para desarrollo: sirve de smoke visual y no se monta
// en produccion. Va lazy para no pesar en el bundle final.
const ComponentsShowcase = lazy(() => import('@/components/dev/ComponentsShowcase'));

const devRoutes = import.meta.env.DEV
  ? [
      {
        path: '/dev/components',
        element: (
          <Suspense fallback={<div className="grid h-screen place-items-center text-brand"><Spinner size={28} /></div>}>
            <ComponentsShowcase />
          </Suspense>
        ),
      },
    ]
  : [];

// Cada area expone sus rutas en features/<rol>/routes; aca solo las componemos y envolvemos
// las de rol en su PrivateRoute y su AppShell.
export const router = createBrowserRouter([
  ...authRoutes,
  ...publicoRoutes,
  {
    path: '/cliente',
    element: (
      <PrivateRoute role="CLIENTE">
        <AppShell role="CLIENTE" />
      </PrivateRoute>
    ),
    children: clienteRoutes,
  },
  {
    path: '/comercio',
    element: (
      <PrivateRoute role="COMERCIO">
        <AppShell role="COMERCIO" />
      </PrivateRoute>
    ),
    children: comercioRoutes,
  },
  {
    path: '/repartidor',
    element: (
      <PrivateRoute role="REPARTIDOR">
        <AppShell role="REPARTIDOR" />
      </PrivateRoute>
    ),
    children: repartidorRoutes,
  },
  ...devRoutes,
  { path: '*', element: <NotFound /> },
]);
