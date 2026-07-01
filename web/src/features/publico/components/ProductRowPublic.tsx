import { Link } from 'react-router-dom';
import { Card, Chip, Icon, Price } from '@/components/ui';
import { cn } from '@/lib/cn';
import { paths } from '@/routes/paths';
import {
  ALERGENO_LABELS,
  APTITUD_LABELS,
  PICANTE_LABELS,
  type ProductoResponse,
} from '@/types';

// Miniatura del producto. La replicamos aquí (en vez de reutilizar la del área cliente) para que
// el módulo público quede autocontenido. Con foto la recorta; sin foto, placeholder con icono.
function Thumb({ src, alt, atenuado }: { src: string | null; alt: string; atenuado: boolean }) {
  const size = 72;
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('shrink-0 rounded-input object-cover', atenuado && 'opacity-60')}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-input bg-surface-muted text-ink-muted', atenuado && 'opacity-60')}
      style={{ width: size, height: size }}
    >
      <Icon name="utensils" size={30} strokeWidth={1.5} />
    </span>
  );
}

// Fila de un producto en el menú público: foto, precio, alérgenos, aptitudes y picante. Como no
// hay sesión, en lugar de agregar al carrito enlaza a iniciar sesión. Lo no disponible se atenúa
// y explica por qué (ahí no ofrecemos el enlace de pedir, porque igual no se podría).
export function ProductRowPublic({ producto }: { producto: ProductoResponse }) {
  const alergenosTexto = producto.alergenos.map((a) => ALERGENO_LABELS[a]).join(', ');
  const muestraPicante = producto.nivelPicante && producto.nivelPicante !== 'NINGUNA';
  const bloqueado = !producto.disponibleAhora;

  return (
    <Card className="flex gap-3">
      <Thumb src={producto.fotoUrl} alt={producto.nombre} atenuado={bloqueado} />
      <div className={cn('flex min-w-0 flex-1 flex-col gap-2', bloqueado && 'opacity-70')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-ink">{producto.nombre}</div>
            {producto.descripcion && (
              <p className="mt-0.5 line-clamp-2 text-small text-ink-soft">{producto.descripcion}</p>
            )}
          </div>
          <Price amount={producto.precio} className="shrink-0" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {producto.aptitudesDieteticas.map((apt) => (
            <Chip key={apt} tone="success" size="sm" icon="leaf">
              {APTITUD_LABELS[apt]}
            </Chip>
          ))}
          {muestraPicante && (
            <Chip tone="warning" size="sm" icon="flame">
              Picante {PICANTE_LABELS[producto.nivelPicante!].toLowerCase()}
            </Chip>
          )}
          {producto.alergenos.length > 0 && (
            <Chip tone="error" size="sm" icon="alertTriangle">
              Contiene: {alergenosTexto}
            </Chip>
          )}
        </div>

        {bloqueado && producto.razonNoDisponible ? (
          <div className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <Icon name="clock" size={13} />
            {producto.razonNoDisponible}
          </div>
        ) : (
          <Link
            to={paths.login}
            className="mt-1 inline-flex w-fit items-center gap-1.5 text-small font-semibold text-brand-text transition-colors duration-150 ease-quart hover:text-brand"
          >
            <Icon name="lock" size={14} />
            Inicia sesión para pedir
          </Link>
        )}
      </div>
    </Card>
  );
}
