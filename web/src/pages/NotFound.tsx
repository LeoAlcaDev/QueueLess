import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

/** Página "No encontrado" para rutas inválidas (MAPA §7.1). */
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-page px-4">
      <EmptyState
        icon={Compass}
        title="No encontramos esta página"
        description="El enlace puede estar roto o la página ya no existe."
        action={
          <Link to="/">
            <Button size="sm">Ir al inicio</Button>
          </Link>
        }
      />
    </div>
  );
}
