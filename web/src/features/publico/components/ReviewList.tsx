import { Avatar, Card, EmptyState, Pagination, Skeleton, Stars } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { UseApiResult } from '@/hooks';
import type { PageResponse } from '@/api';
import { OBJETIVO_RESENA_LABELS, type ResenaResponse } from '@/types';
import { PublicErrorState } from './PublicErrorState';

// Iniciales para el avatar cuando no hay foto del autor: las dos primeras palabras del nombre.
function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase();
}

// Fecha corta en formato local peruano. Las reseñas del backend traen createdAt como ISO.
function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ReviewListProps {
  resenas: UseApiResult<PageResponse<ResenaResponse>>;
  page: number;
  size: number;
  onPage: (page: number) => void;
}

// Tarjeta de reseñas del local, de solo lectura. Reusa la carga paginada del hook y muestra
// autor, estrellas y comentario. Es el mismo bloque que ve el cliente, sin ninguna acción.
export function ReviewList({ resenas, page, size, onPage }: ReviewListProps) {
  return (
    <Card className="flex flex-col gap-3">
      <span className="ql-section-label">Reseñas</span>

      {resenas.loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      ) : resenas.error ? (
        <PublicErrorState error={resenas.error} onRetry={resenas.refetch} title="No pudimos cargar las reseñas" />
      ) : !resenas.data || resenas.data.content.length === 0 ? (
        <EmptyState icon="star" title="Aún sin reseñas" description="Todavía nadie ha opinado de este local." compact />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {resenas.data.content.map((resena, i) => (
              <div key={resena.id} className={cn('flex gap-2.5', i > 0 && 'border-t border-line pt-3')}>
                <Avatar initials={iniciales(resena.autorNombre)} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-small font-semibold text-ink">{resena.autorNombre}</span>
                    <Stars value={resena.calificacion} size={12} />
                  </div>
                  {resena.comentario && (
                    <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{resena.comentario}</p>
                  )}
                  <div className="mt-0.5 text-[11px] text-ink-muted">
                    {OBJETIVO_RESENA_LABELS[resena.objetivoTipo]} · {formatFecha(resena.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {resenas.data.totalElements > size && (
            <Pagination page={page} size={size} total={resenas.data.totalElements} onPage={onPage} />
          )}
        </>
      )}
    </Card>
  );
}
