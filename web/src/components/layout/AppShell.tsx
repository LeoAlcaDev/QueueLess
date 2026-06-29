import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth";
import { Spinner } from "@/components/ui";
import { TycGate } from "@/features/tyc/TycGate";
import { activeArea } from "@/app/navigation";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { OfflineBanner } from "./OfflineBanner";

/**
 * Chrome de las áreas autenticadas: Sidebar (≥ lg) / BottomNav (< lg), Header
 * sticky y gate de TyC. El área activa se deriva de la ruta. Renderiza la
 * pantalla vía <Outlet>.
 */
export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const roles = user?.roles ?? [];
  const area = activeArea(location.pathname, roles);

  return (
    <TycGate>
      <div className="min-h-screen bg-page text-content lg:flex">
        <Sidebar area={area} roles={roles} onLogout={logout} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header area={area} roles={roles} />
          <OfflineBanner />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
              <Suspense
                fallback={
                  <div className="grid min-h-[40vh] place-items-center">
                    <Spinner size={24} />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </div>
          </main>
          <BottomNav area={area} />
        </div>
      </div>
    </TycGate>
  );
}
