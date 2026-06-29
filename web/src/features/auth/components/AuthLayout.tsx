import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pie con el enlace a la otra pantalla (login ↔ registro). */
  footer?: ReactNode;
}

/** Contenedor centrado para Login y Registro: marca arriba, tarjeta al medio. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-page px-4 py-10 text-content">
      <Link to="/" className="flex items-center gap-2">
        <img src="/queueless-mark.svg" alt="" className="h-9 w-9" />
        <span className="text-h2 font-bold">QueueLess</span>
      </Link>

      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-md">
        <div className="mb-5 flex flex-col gap-1">
          <h1 className="text-h2 font-bold text-content">{title}</h1>
          {subtitle && (
            <p className="text-small text-content-secondary">{subtitle}</p>
          )}
        </div>
        {children}
      </div>

      {footer && <p className="text-small text-content-secondary">{footer}</p>}
    </div>
  );
}
