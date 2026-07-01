import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// Pantallas del panel de comercio. Van lazy (default export) y se montan dentro del AppShell
// que aporta la base (sidebar + topbar), aqui solo definimos el contenido de cada ruta.
const Queue = lazy(() => import('./pages/Queue'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Stores = lazy(() => import('./pages/Stores'));
const StoreForm = lazy(() => import('./pages/StoreForm'));
const Products = lazy(() => import('./pages/Products'));
const ProductForm = lazy(() => import('./pages/ProductForm'));
const Occupancy = lazy(() => import('./pages/Occupancy'));
const Claims = lazy(() => import('./pages/Claims'));
const Profile = lazy(() => import('./pages/Profile'));

export const comercioRoutes: RouteObject[] = [
  { index: true, element: <Queue /> },
  { path: 'pedidos/:id', element: <OrderDetail /> },
  { path: 'locales', element: <Stores /> },
  { path: 'locales/nuevo', element: <StoreForm /> },
  { path: 'locales/:id/editar', element: <StoreForm /> },
  { path: 'productos', element: <Products /> },
  { path: 'productos/nuevo', element: <ProductForm /> },
  { path: 'productos/:id/editar', element: <ProductForm /> },
  { path: 'ocupacion', element: <Occupancy /> },
  { path: 'reclamos', element: <Claims /> },
  { path: 'perfil', element: <Profile /> },
];
