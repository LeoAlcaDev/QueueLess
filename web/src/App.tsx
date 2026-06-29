import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute, RoleRoute } from "./auth";
import { AppShell } from "./components/layout";
import { Spinner } from "./components/ui";

// Lazy load por área (code-splitting). El chrome (AppShell) no es lazy: tiene su
// propio Suspense para que navegar dentro del shell solo recargue el contenido.
const LandingPage = lazy(() => import("./features/public/LandingPage"));
const LoginPage = lazy(() => import("./features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("./features/auth/pages/RegisterPage"));
const PublicCatalogLayout = lazy(
  () => import("./features/public/PublicCatalogLayout"),
);
const AccountPage = lazy(() => import("./features/cuenta/pages/AccountPage"));
const ProfilesPage = lazy(() => import("./features/cuenta/pages/ProfilesPage"));
const CatalogoPage = lazy(
  () => import("./features/cliente/pages/CatalogoPage"),
);
const LocalDetailPage = lazy(
  () => import("./features/cliente/pages/LocalDetailPage"),
);
const CarritoPage = lazy(() => import("./features/cliente/pages/CarritoPage"));
const MisPedidosPage = lazy(
  () => import("./features/cliente/pages/MisPedidosPage"),
);
const PedidoDetailPage = lazy(
  () => import("./features/cliente/pages/PedidoDetailPage"),
);
const PointsPage = lazy(() => import("./features/cliente/pages/PointsPage"));
const ReclamosPage = lazy(
  () => import("./features/cliente/pages/ReclamosPage"),
);
const AsistentePage = lazy(
  () => import("./features/cliente/pages/AsistentePage"),
);
const ColaPage = lazy(() => import("./features/comercio/pages/ColaPage"));
const PedidoComercioDetailPage = lazy(
  () => import("./features/comercio/pages/PedidoComercioDetailPage"),
);
const LocalesPage = lazy(() => import("./features/comercio/pages/LocalesPage"));
const ProductosPage = lazy(
  () => import("./features/comercio/pages/ProductosPage"),
);
const ReclamosComercioPage = lazy(
  () => import("./features/comercio/pages/ReclamosComercioPage"),
);
const DisponiblesPage = lazy(
  () => import("./features/repartidor/pages/DisponiblesPage"),
);
const EntregaDetailPage = lazy(
  () => import("./features/repartidor/pages/EntregaDetailPage"),
);
const MisEntregasPage = lazy(
  () => import("./features/repartidor/pages/MisEntregasPage"),
);
const Placeholder = lazy(() => import("./pages/Placeholder"));
const DesignDemo = lazy(() => import("./pages/DesignDemo"));
const NotFound = lazy(() => import("./pages/NotFound"));

function FullScreenSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-page">
      <Spinner size={28} />
    </div>
  );
}

/** Árbol de rutas: público (landing/auth/catálogo) + áreas autenticadas por rol bajo la AppShell. */
export default function App() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
        {/* Público */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/_design" element={<DesignDemo />} />

        {/* Catálogo público (sin login). Si hay sesión, redirige a la versión in-shell. */}
        <Route element={<PublicCatalogLayout />}>
          <Route path="/locales" element={<CatalogoPage />} />
          <Route path="/locales/:id" element={<LocalDetailPage />} />
        </Route>

        {/* Autenticado: chrome compartido + gate de TyC */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="cuenta" element={<AccountPage />} />
            <Route path="cuenta/perfiles" element={<ProfilesPage />} />

            <Route path="cliente" element={<RoleRoute rol="CLIENTE" />}>
              <Route index element={<CatalogoPage />} />
              <Route path="locales/:id" element={<LocalDetailPage />} />
              <Route path="carrito" element={<CarritoPage />} />
              <Route path="pedidos" element={<MisPedidosPage />} />
              <Route path="pedidos/:id" element={<PedidoDetailPage />} />
              <Route path="points" element={<PointsPage />} />
              <Route path="reclamos" element={<ReclamosPage />} />
              <Route path="asistente" element={<AsistentePage />} />
              <Route path="*" element={<Placeholder />} />
            </Route>
            <Route path="comercio" element={<RoleRoute rol="COMERCIO" />}>
              <Route index element={<ColaPage />} />
              <Route
                path="pedidos/:id"
                element={<PedidoComercioDetailPage />}
              />
              <Route path="locales" element={<LocalesPage />} />
              <Route path="productos" element={<ProductosPage />} />
              <Route path="reclamos" element={<ReclamosComercioPage />} />
              <Route path="*" element={<Placeholder />} />
            </Route>
            <Route path="repartidor" element={<RoleRoute rol="REPARTIDOR" />}>
              <Route index element={<DisponiblesPage />} />
              <Route path="solicitudes/:id" element={<EntregaDetailPage />} />
              <Route path="entregas" element={<MisEntregasPage />} />
              <Route path="points" element={<PointsPage />} />
              <Route path="*" element={<Placeholder />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
