import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout';
import { Button } from '@/components/ui';
import { paths } from '@/routes/paths';

// Ancho del contenido del área pública. Lo comparten la barra y el <main> del cascarón para que
// el header quede alineado con la grilla de abajo; coincide con el ancho de las áreas con sesión.
export const PUBLIC_CONTENT_MAX_WIDTH = 1080;

// Barra superior propia de las pantallas públicas. No usamos el AppShell porque estas vistas se
// ven sin sesión: a la izquierda la marca (lleva al landing) y a la derecha los accesos a la cuenta.
export function PublicHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8"
        style={{ maxWidth: PUBLIC_CONTENT_MAX_WIDTH }}
      >
        <Link to={paths.landing} aria-label="Ir al inicio">
          <Logo size={22} />
        </Link>
        <div className="flex items-center gap-2.5">
          <Link to={paths.login}>
            <Button variant="secondary" size="sm">
              Iniciar sesión
            </Button>
          </Link>
          <Link to={paths.register}>
            <Button size="sm">Crear cuenta</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
