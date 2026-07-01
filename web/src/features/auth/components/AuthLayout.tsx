import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/layout/Logo';
import { paths } from '@/routes/paths';
import { BrandPanel } from './BrandPanel';

type Width = 'sm' | 'md';

interface AuthLayoutProps {
  children: ReactNode;
  // El registro es mas alto que login/landing: lo alineamos arriba y dejamos que la columna
  // haga scroll, en vez de centrar todo vertical.
  align?: 'center' | 'top';
  // Ancho de la columna del formulario. El registro pide algo mas ancho por las tarjetas de rol.
  width?: Width;
}

const WIDTH: Record<Width, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
};

// Estructura partida de las pantallas de acceso: el panel naranja a la izquierda (solo en
// pantallas anchas) y, a la derecha, una columna centrada de ancho acotado con el contenido.
export function AuthLayout({ children, align = 'center', width = 'sm' }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-page">
      <BrandPanel />
      <div
        className={cn(
          'flex flex-1 flex-col px-5 py-10 lg:px-10',
          align === 'center' ? 'justify-center' : 'overflow-y-auto',
        )}
      >
        <div className={cn('mx-auto w-full', WIDTH[width])}>
          {/* en pantallas angostas el panel naranja no aparece, asi que mostramos la marca aca */}
          <div className="mb-8 flex lg:hidden">
            <Link to={paths.landing} aria-label="Volver al inicio">
              <Logo size={26} />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
