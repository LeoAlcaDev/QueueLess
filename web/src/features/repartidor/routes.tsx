import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// Pantallas del area de repartidor. Van lazy para no cargarlas hasta entrar a /repartidor;
// el AppShell ya envuelve el Outlet en un Suspense. Son hijas relativas de /repartidor.
const Available = lazy(() => import('./pages/Available'));
const ActiveDelivery = lazy(() => import('./pages/ActiveDelivery'));
const History = lazy(() => import('./pages/History'));
const Points = lazy(() => import('./pages/Points'));
const Profile = lazy(() => import('./pages/Profile'));

export const repartidorRoutes: RouteObject[] = [
  { index: true, element: <Available /> },
  { path: 'activa', element: <ActiveDelivery /> },
  { path: 'entregas', element: <History /> },
  { path: 'queuepoints', element: <Points /> },
  { path: 'perfil', element: <Profile /> },
];
