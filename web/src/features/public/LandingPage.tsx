import { Link, Navigate } from "react-router-dom";
import { Clock, QrCode, Sparkles } from "lucide-react";
import { useAuth } from "@/auth";
import { Button, Spinner } from "@/components/ui";
import { defaultAreaPath } from "@/app/navigation";

const FEATURES = [
  {
    icon: Clock,
    title: "Sin colas",
    text: "Pide y paga desde la web; llega cuando esté listo.",
  },
  {
    icon: QrCode,
    title: "Entrega con QR",
    text: "Muestra tu código y retira tu pedido en segundos.",
  },
  {
    icon: Sparkles,
    title: "Gana QueuePoints",
    text: "Acumula puntos en cada pedido y canjéalos.",
  },
] as const;

/** Landing pública. Si ya hay sesión, redirige al área del primer rol. */
export default function LandingPage() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-page">
        <Spinner size={28} />
      </div>
    );
  }
  if (status === "authenticated") {
    return <Navigate to={defaultAreaPath(user?.roles ?? [])} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-page text-content">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-2">
          <img src="/queueless-mark.svg" alt="" className="h-8 w-8" />
          <span className="text-h3 font-bold">QueueLess</span>
        </div>
        <Link to="/auth/login">
          <Button variant="ghost" size="sm">
            Iniciar sesión
          </Button>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-display font-bold">Tu comida, sin esperas.</h1>
          <p className="max-w-xl text-body text-content-secondary">
            Pide en tus locales favoritos, paga en línea y sigue tu pedido en
            vivo. Recógelo o recíbelo a domicilio, sin hacer cola.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth/register">
              <Button size="md">Crear cuenta</Button>
            </Link>
            <Link to="/auth/login">
              <Button variant="secondary" size="md">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
          <Link
            to="/locales"
            className="rounded text-small font-semibold text-content-brand hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            Explorar locales sin cuenta →
          </Link>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface p-5"
            >
              <span className="grid h-11 w-11 place-items-center rounded-pill bg-brand-soft text-content-brand">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h2 className="text-body font-semibold">{title}</h2>
              <p className="text-small text-content-secondary">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
