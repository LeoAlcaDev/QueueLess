import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, LogOut, Plus, UserCircle } from "lucide-react";
import { useAuth } from "@/auth";
import { Badge, Button, Card, useToast } from "@/components/ui";
import { userFacingMessage } from "@/lib/errors";
import { ROLES, type Rol } from "@/types";

const ROLE_LABEL: Record<Rol, string> = {
  CLIENTE: "Cliente",
  COMERCIO: "Comercio",
  REPARTIDOR: "Repartidor",
};

const ROLE_DESC: Record<Rol, string> = {
  CLIENTE: "Pide y sigue tus pedidos.",
  COMERCIO: "Gestiona tu local y la cola.",
  REPARTIDOR: "Toma y cierra entregas.",
};

/**
 * Mi cuenta: datos del usuario, roles activos y activación de nuevos roles
 * (POST /usuarios/me/activar-rol → refresca el token con la nueva autoridad).
 */
export default function AccountPage() {
  const { user, roles, activarRol, logout } = useAuth();
  const toast = useToast();
  const [activating, setActivating] = useState<Rol | null>(null);

  const inactiveRoles = ROLES.filter((r) => !roles.includes(r));

  async function onActivar(rol: Rol) {
    setActivating(rol);
    try {
      await activarRol(rol);
      toast.success(`Rol ${ROLE_LABEL[rol].toLowerCase()} activado.`);
    } catch (err) {
      toast.error(userFacingMessage(err));
    } finally {
      setActivating(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-pill bg-brand-soft text-content-brand">
          <UserCircle size={26} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-h3 font-semibold text-content">
            {user?.nombreCompleto}
          </p>
          <p className="truncate text-small text-content-secondary">
            {user?.email}
          </p>
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold text-content">Roles activos</h2>
        <Card className="flex flex-wrap gap-2">
          {roles.length ? (
            roles.map((rol) => (
              <Badge key={rol} tone="brand">
                {ROLE_LABEL[rol]}
              </Badge>
            ))
          ) : (
            <p className="text-small text-content-secondary">
              Todavía no activaste ningún rol. Activa uno para empezar.
            </p>
          )}
        </Card>
      </section>

      {inactiveRoles.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold text-content">
            Activar otro rol
          </h2>
          <div className="flex flex-col gap-2">
            {inactiveRoles.map((rol) => (
              <Card
                key={rol}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-body font-semibold text-content">
                    {ROLE_LABEL[rol]}
                  </p>
                  <p className="text-small text-content-secondary">
                    {ROLE_DESC[rol]}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus size={16} />}
                  loading={activating === rol}
                  onClick={() => onActivar(rol)}
                >
                  Activar
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <Link to="/cuenta/perfiles">
          <Card className="flex items-center justify-between gap-3 hover:bg-surface-muted">
            <div>
              <p className="text-body font-semibold text-content">
                Mis perfiles
              </p>
              <p className="text-small text-content-secondary">
                Edita tus datos por rol (dirección, RUC, disponibilidad…).
              </p>
            </div>
            <ChevronRight
              size={20}
              className="shrink-0 text-content-muted"
              aria-hidden="true"
            />
          </Card>
        </Link>
      </section>

      <Button
        variant="ghost"
        leftIcon={<LogOut size={18} />}
        onClick={logout}
        className="self-start"
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
