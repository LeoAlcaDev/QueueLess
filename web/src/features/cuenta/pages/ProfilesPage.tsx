import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { perfilesApi } from "@/api";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { userFacingMessage } from "@/lib/errors";
import type { PerfilesResponse } from "@/types";
import { ClienteProfileForm } from "../components/ClienteProfileForm";
import { ComercioProfileForm } from "../components/ComercioProfileForm";
import { RepartidorProfileForm } from "../components/RepartidorProfileForm";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; perfiles: PerfilesResponse };

/** Edición de perfiles por rol (GET /me/perfiles + PUT por rol). */
export default function ProfilesPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(() => {
    setState({ status: "loading" });
    perfilesApi
      .getPerfiles()
      .then((perfiles) => setState({ status: "ready", perfiles }))
      .catch((err) =>
        setState({ status: "error", message: userFacingMessage(err) }),
      );
  }, []);

  useEffect(() => load(), [load]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/cuenta"
        className="inline-flex items-center gap-1.5 self-start text-small font-medium text-content-secondary hover:text-content"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a mi cuenta
      </Link>

      {state.status === "loading" && (
        <div className="grid min-h-[40vh] place-items-center">
          <Spinner size={24} />
        </div>
      )}

      {state.status === "error" && (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar tus perfiles"
          description={state.message}
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              Reintentar
            </Button>
          }
        />
      )}

      {state.status === "ready" && (
        <div className="flex flex-col gap-4">
          {state.perfiles.cliente && (
            <ClienteProfileForm perfil={state.perfiles.cliente} />
          )}
          {state.perfiles.comercio && (
            <ComercioProfileForm perfil={state.perfiles.comercio} />
          )}
          {state.perfiles.repartidor && (
            <RepartidorProfileForm perfil={state.perfiles.repartidor} />
          )}
          {!state.perfiles.cliente &&
            !state.perfiles.comercio &&
            !state.perfiles.repartidor && (
              <EmptyState
                title="Aún no tienes perfiles"
                description="Activa un rol desde tu cuenta para configurar su perfil."
              />
            )}
        </div>
      )}
    </div>
  );
}
