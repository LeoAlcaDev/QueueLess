import { formatDate } from "@/lib/format";
import type { ResenaResponse } from "@/types";
import { Stars } from "./Stars";

/** Lista de reseñas de un local/repartidor. */
export function ResenaList({ resenas }: { resenas: ResenaResponse[] }) {
  if (!resenas.length) {
    return (
      <p className="text-small text-content-secondary">
        Todavía no hay reseñas.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {resenas.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-1 border-b border-line pb-3 last:border-0 last:pb-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-small font-semibold text-content">
              {r.autorNombre}
            </span>
            <span className="text-badge text-content-muted">
              {formatDate(r.createdAt)}
            </span>
          </div>
          <Stars value={r.calificacion} size={14} />
          {r.comentario && (
            <p className="text-small text-content-secondary">{r.comentario}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
