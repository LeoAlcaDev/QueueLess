import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { paths } from '@/routes/paths';

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-page p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-[88px] font-bold leading-none text-surface-muted">404</div>
        <div className="text-h2 font-bold text-ink">Esta página no existe</div>
        <p className="max-w-sm text-small text-ink-soft">
          Puede que el enlace esté roto o que el contenido ya no esté disponible.
        </p>
        <Link to={paths.landing}>
          <Button icon="home">Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
