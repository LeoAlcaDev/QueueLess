import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { Logo } from '@/components/layout';
import { paths } from '@/routes/paths';

interface AccountFrameProps {
  title?: string;
  backTo?: { to: string; label: string };
  maxWidth?: number;
  children: ReactNode;
}

// Marco de las pantallas de cuenta (pantalla completa, fuera del AppShell): una barra con la
// marca arriba y el contenido centrado debajo. backTo agrega el "volver" antes del titulo.
export function AccountFrame({ title, backTo, maxWidth = 560, children }: AccountFrameProps) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="flex h-[60px] shrink-0 items-center border-b border-line bg-surface px-7">
        <Link to={paths.landing} aria-label="Ir al inicio">
          <Logo size={22} />
        </Link>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full px-6 pb-14 pt-8" style={{ maxWidth }}>
          {backTo && (
            <Link
              to={backTo.to}
              className="mb-4 inline-flex items-center gap-1 text-small font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              <Icon name="chevronLeft" size={18} />
              {backTo.label}
            </Link>
          )}
          {title && <h1 className="mb-5 text-h2 font-bold text-ink">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
}
