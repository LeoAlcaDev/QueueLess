import { Suspense, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { useTheme } from '@/context/ThemeContext';
import { NAV_BY_ROLE } from '@/routes/navigation';
import { paths } from '@/routes/paths';
import { ROL_LABELS, type Rol } from '@/types/enums';
import { Avatar, Icon, IconButton, Spinner } from '@/components/ui';
import { Sidebar } from './Sidebar';
import { PageChromeContext, type PageChrome } from './pageChrome';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function PageLoader() {
  return (
    <div className="grid place-items-center py-24 text-brand">
      <Spinner size={28} />
    </div>
  );
}

// Selector de rol para quienes tienen mas de uno: cambia el rol activo y lleva al panel.
function RoleSwitcher({ roles, active, onSelect }: { roles: Rol[]; active: Rol | null; onSelect: (role: Rol) => void }) {
  return (
    <select
      value={active ?? ''}
      onChange={(e) => onSelect(e.target.value as Rol)}
      aria-label="Cambiar de rol"
      className="h-9 rounded-button border border-line bg-surface px-2.5 text-small font-semibold text-ink-soft outline-none"
    >
      {roles.map((r) => (
        <option key={r} value={r}>
          {ROL_LABELS[r]}
        </option>
      ))}
    </select>
  );
}

// Shell del panel: sidebar fijo de 240px en desktop (drawer en mobile) y una topbar fija con
// el titulo de la pantalla a la izquierda y, a la derecha, las acciones contextuales que cada
// pantalla declara (via PageActions), el switcher de rol y el cambio de tema. El usuario y el
// cerrar sesion viven en el pie del sidebar, como en el diseno.
export function AppShell({ role }: { role: Rol }) {
  const { user, roles, activeRole, setActiveRole, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chrome, setChrome] = useState<PageChrome | null>(null);
  const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null);

  const items = NAV_BY_ROLE[role];

  // titulo por defecto: la etiqueta de la seccion de nav que matchea la ruta actual
  const defaultTitle = useMemo(() => {
    const match = items.find((it) =>
      it.end ? location.pathname === it.to : location.pathname.startsWith(it.to),
    );
    return match?.label ?? ROL_LABELS[role];
  }, [items, location.pathname, role]);

  // si la pantalla declaro su chrome para ESTA ruta lo usamos; si no, el titulo por defecto
  const here = chrome && chrome.path === location.pathname ? chrome : null;
  const title = here?.title ?? defaultTitle;
  const sub = here?.sub;
  const maxWidth = here?.maxWidth ?? 1040;

  const switchRole = (next: Rol) => {
    setActiveRole(next);
    navigate(paths.home(next));
  };

  const handleLogout = () => {
    logout();
    navigate(paths.login);
  };

  const footer = (
    <div className="mt-2 flex flex-col gap-1 border-t border-line pt-3">
      {user && (
        <Link
          to={paths.cuenta}
          className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 transition-colors hover:bg-surface-muted"
        >
          <Avatar initials={initials(user.nombreCompleto)} size={32} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-small font-semibold text-ink">{user.nombreCompleto}</div>
            <div className="truncate text-[12px] text-ink-muted">Ver mi cuenta</div>
          </div>
          <Icon name="chevronRight" size={16} className="shrink-0 text-ink-muted" />
        </Link>
      )}
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-small font-medium text-ink-muted transition-colors hover:bg-surface-muted"
      >
        <Icon name="logOut" size={18} />
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <PageChromeContext.Provider value={{ chrome, setChrome, actionsHost, setActionsHost }}>
      <div className="flex h-screen overflow-hidden bg-page">
        <aside className="hidden shrink-0 border-r border-line lg:block">
          <Sidebar role={role} items={items} footer={footer} />
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-overlay" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 left-0 border-r border-line shadow-lg">
              <Sidebar role={role} items={items} onNavigate={() => setDrawerOpen(false)} footer={footer} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-line bg-surface px-4 lg:px-7">
            <IconButton icon="menu" label="Abrir menú" className="lg:hidden" onClick={() => setDrawerOpen(true)} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[21px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
              {sub && <p className="truncate text-small text-ink-muted">{sub}</p>}
            </div>
            <div className="flex items-center gap-2.5">
              <div ref={setActionsHost} className="flex items-center gap-2.5" />
              {roles.length > 1 && <RoleSwitcher roles={roles} active={activeRole} onSelect={switchRole} />}
              <IconButton
                icon={theme === 'dark' ? 'sun' : 'moon'}
                label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                onClick={toggle}
              />
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto px-4 py-7 lg:px-8" style={{ maxWidth }}>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </PageChromeContext.Provider>
  );
}
