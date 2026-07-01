import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { http, endpoints, isApiError } from '@/api';
import { useAuth } from '@/auth';
import { useApi, useToast } from '@/hooks';
import { Avatar, Button, Card, Chip, Icon, Modal, Skeleton, StateBanner, type IconName } from '@/components/ui';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import { ROL_LABELS, type Rol, type TycEstadoResponse } from '@/types';
import { AccountFrame } from '../components/AccountFrame';
import { TermsModal } from '../components/TermsModal';

const TODOS_LOS_ROLES: Rol[] = ['CLIENTE', 'COMERCIO', 'REPARTIDOR'];

const ROLE_ICON: Record<Rol, IconName> = {
  CLIENTE: 'shoppingBag',
  COMERCIO: 'store',
  REPARTIDOR: 'bike',
};

const ACTIVAR_SUB: Record<Rol, string> = {
  CLIENTE: 'Pre-ordena tu comida y recógela sin colas',
  COMERCIO: 'Vende desde tu local en el campus',
  REPARTIDOR: 'Haz entregas y gana QueuePoints',
};

function inicialesDe(nombre: string): string {
  const letras = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
  return letras.toUpperCase() || '?';
}

function rutaPerfil(rol: Rol): string {
  if (rol === 'COMERCIO') return paths.comercio.perfil;
  if (rol === 'REPARTIDOR') return paths.repartidor.perfil;
  return paths.cliente.perfil;
}

// Fila de lista con icono, etiqueta y chevron: navega (to) o dispara una accion (onClick).
function AccountRow({
  icon,
  label,
  sub,
  to,
  onClick,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  to?: string;
  onClick?: () => void;
}) {
  const clase = 'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted';
  const contenido = (
    <>
      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-input bg-surface-muted text-ink-soft">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-small font-semibold text-ink">{label}</div>
        {sub && <div className="text-[12px] text-ink-muted">{sub}</div>}
      </div>
      <Icon name="chevronRight" size={18} className="shrink-0 text-ink-muted" />
    </>
  );
  return to ? (
    <Link to={to} className={clase}>
      {contenido}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={clase}>
      {contenido}
    </button>
  );
}

// Mi cuenta: el hub de la sesion. Reune el perfil, la gestion de roles (ver cada perfil,
// cambiar de rol activo, activar uno nuevo) y los accesos a terminos y al libro de
// reclamaciones. Es de pantalla completa y sirve para cualquier rol.
export default function Account() {
  const { user, status, roles, activeRole, setActiveRole, logout, activarRol } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [termsOpen, setTermsOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [activando, setActivando] = useState<Rol | null>(null);

  const { data: tyc, refetch: refetchTyc } = useApi(
    (signal) => http.get<TycEstadoResponse>(endpoints.tyc.estado, { signal }),
    [],
  );

  if (status === 'loading') {
    return (
      <AccountFrame backTo={{ to: paths.landing, label: 'Volver' }}>
        <div className="space-y-4">
          <Skeleton width={84} height={84} rounded="rounded-pill" />
          <Skeleton width="50%" height={20} />
          <Skeleton width="70%" height={14} />
          <Skeleton width="100%" height={140} rounded="rounded-card" />
          <Skeleton width="100%" height={160} rounded="rounded-card" />
        </div>
      </AccountFrame>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return <Navigate to={paths.login} replace />;
  }

  const rolesFaltantes = TODOS_LOS_ROLES.filter((rol) => !roles.includes(rol));
  const volverAlPanel = activeRole ? paths.home(activeRole) : paths.landing;

  const handleActivar = async (rol: Rol) => {
    setActivando(rol);
    try {
      await activarRol(rol);
      toast.success(`Activaste el rol ${ROL_LABELS[rol]}`);
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'No pudimos activar el rol.');
    } finally {
      setActivando(null);
    }
  };

  const cambiarRol = (rol: Rol) => {
    setActiveRole(rol);
    setSwitchOpen(false);
    navigate(paths.home(rol));
  };

  const handleLogout = () => {
    logout();
    navigate(paths.login);
  };

  return (
    <AccountFrame backTo={{ to: volverAlPanel, label: 'Volver al panel' }}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar initials={inicialesDe(user.nombreCompleto)} size={84} />
          <div className="min-w-0 flex-1">
            <div className="text-[22px] font-bold tracking-tight text-ink">{user.nombreCompleto}</div>
            <div className="mt-0.5 truncate text-[13.5px] text-ink-muted">{user.email}</div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {roles.map((rol) => (
                <Chip key={rol} tone={rol === 'REPARTIDOR' ? 'points' : 'brand'} icon={ROLE_ICON[rol]}>
                  {ROL_LABELS[rol]}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {tyc && !tyc.aceptoVersionVigente && (
          <StateBanner
            tone="warning"
            title="Tienes términos pendientes"
            action={
              <Button size="sm" onClick={() => setTermsOpen(true)}>
                Aceptar
              </Button>
            }
          >
            Hay una versión nueva de los términos y condiciones que debes aceptar.
          </StateBanner>
        )}

        <section className="space-y-2.5">
          <h2 className="ql-section-label">Tus perfiles</h2>
          <Card pad="none" className="divide-y divide-line overflow-hidden">
            {roles.map((rol) => (
              <AccountRow
                key={rol}
                icon={ROLE_ICON[rol]}
                label={`Perfil de ${ROL_LABELS[rol].toLowerCase()}`}
                to={rutaPerfil(rol)}
              />
            ))}
            {roles.length > 1 && (
              <AccountRow
                icon="refresh"
                label="Cambiar de rol"
                sub={activeRole ? `Ahora: ${ROL_LABELS[activeRole]}` : undefined}
                onClick={() => setSwitchOpen(true)}
              />
            )}
          </Card>
        </section>

        {rolesFaltantes.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="ql-section-label">Activar otro rol</h2>
            <div className="space-y-2.5">
              {rolesFaltantes.map((rol) => (
                <Card key={rol} pad="none" className="flex items-center gap-3 px-3.5 py-3.5">
                  <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-input bg-brand-soft text-brand-text">
                    <Icon name={ROLE_ICON[rol]} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-small font-semibold text-ink">{ROL_LABELS[rol]}</div>
                    <div className="text-[12.5px] text-ink-soft">{ACTIVAR_SUB[rol]}</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="plus"
                    loading={activando === rol}
                    onClick={() => handleActivar(rol)}
                  >
                    Activar
                  </Button>
                </Card>
              ))}
            </div>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              Al activar un rol nuevo refrescamos tu sesión para darte acceso a su panel.
            </p>
          </section>
        )}

        <section className="space-y-2.5">
          <h2 className="ql-section-label">Más</h2>
          <Card pad="none" className="divide-y divide-line overflow-hidden">
            <AccountRow
              icon="fileText"
              label="Términos y condiciones"
              sub={tyc ? (tyc.aceptoVersionVigente ? 'Aceptados' : 'Tienes una versión pendiente') : undefined}
              onClick={() => setTermsOpen(true)}
            />
            <AccountRow
              icon="clipboard"
              label="Libro de reclamaciones"
              sub="Deja o revisa tus reclamos"
              to={paths.cuentaReclamos}
            />
          </Card>
        </section>

        <Button variant="secondary" icon="logOut" full onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} onAccepted={refetchTyc} />

      <Modal open={switchOpen} onClose={() => setSwitchOpen(false)} width={400}>
        <div className="flex flex-col gap-3 p-6">
          <div>
            <h2 className="text-h3 font-bold text-ink">Cambiar de rol</h2>
            <p className="mt-1 text-small text-ink-soft">Elige el panel con el que quieres seguir.</p>
          </div>
          <div className="flex flex-col gap-2">
            {roles.map((rol) => {
              const actual = rol === activeRole;
              return (
                <button
                  key={rol}
                  type="button"
                  onClick={() => cambiarRol(rol)}
                  className={cn(
                    'flex items-center gap-3 rounded-input border px-3.5 py-3 text-left transition-colors',
                    actual ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-muted',
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-surface-muted text-ink-soft">
                    <Icon name={ROLE_ICON[rol]} size={18} />
                  </span>
                  <span className="flex-1 text-small font-semibold text-ink">{ROL_LABELS[rol]}</span>
                  {actual && (
                    <Chip tone="brand" size="sm">
                      Activo
                    </Chip>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </AccountFrame>
  );
}
