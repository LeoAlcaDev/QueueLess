import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui';

// Enlace discreto para volver al listado anterior en las pantallas de detalle. El titulo de
// la pantalla vive en la topbar, asi que aca solo queda el "Volver".
export function BackLink({ to, children = 'Volver' }: { to: string; children?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-1.5 text-small font-semibold text-ink-soft transition-colors duration-150 ease-quart hover:text-ink"
    >
      <Icon name="arrowLeft" size={16} />
      {children}
    </Link>
  );
}
