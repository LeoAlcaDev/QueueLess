import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import ClienteLayout from './ClienteLayout';

// Las pantallas van lazy (default export) para code-splitting; el AppShell de la base ya
// provee el Suspense alrededor de su Outlet. Todas cuelgan de un layout sin ruta propia
// que monta el CartProvider, así el catálogo, el local y el carrito comparten estado.
const Home = lazy(() => import('./pages/Home'));
const VendorDetail = lazy(() => import('./pages/VendorDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Payment = lazy(() => import('./pages/Payment'));
const OrderQr = lazy(() => import('./pages/OrderQr'));
const Review = lazy(() => import('./pages/Review'));
const Points = lazy(() => import('./pages/Points'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Profile = lazy(() => import('./pages/Profile'));

export const clienteRoutes: RouteObject[] = [
  {
    element: <ClienteLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'locales/:id', element: <VendorDetail /> },
      { path: 'carrito', element: <Cart /> },
      { path: 'pedidos', element: <Orders /> },
      { path: 'pedidos/:id', element: <OrderDetail /> },
      { path: 'pedidos/:id/seguimiento', element: <OrderTracking /> },
      { path: 'pedidos/:id/pago', element: <Payment /> },
      { path: 'pedidos/:id/qr', element: <OrderQr /> },
      { path: 'pedidos/:id/resena', element: <Review /> },
      { path: 'queuepoints', element: <Points /> },
      { path: 'asistente', element: <Assistant /> },
      { path: 'perfil', element: <Profile /> },
    ],
  },
];
