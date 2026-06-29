import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  MessageSquareWarning,
  ShoppingCart,
  Store,
  TriangleAlert,
} from "lucide-react";
import { catalogoApi } from "@/api";
import { useAuth } from "@/auth";
import { Button, EmptyState, Input, Skeleton } from "@/components/ui";
import { useFetch } from "@/hooks";
import { userFacingMessage } from "@/lib/errors";
import { useCart } from "../cart/CartContext";
import { LocalCard } from "../components/LocalCard";

/** Catálogo público de locales abiertos (GET /puntos-de-venta). Sin login. */
export default function CatalogoPage() {
  const { isAuthenticated } = useAuth();
  const cart = useCart();
  const { data, loading, error, refetch } = useFetch(() =>
    catalogoApi.listPuntosDeVenta(),
  );
  const [q, setQ] = useState("");

  const detailBase = isAuthenticated ? "/cliente/locales" : "/locales";

  const locales = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter(
      (l) =>
        l.nombre.toLowerCase().includes(term) ||
        l.ubicacion.toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div className="flex flex-col gap-5">
      {isAuthenticated && (
        <div className="flex flex-wrap gap-2">
          <Link to="/cliente/asistente">
            <Button variant="secondary" size="sm" leftIcon={<Bot size={16} />}>
              Asistente
            </Button>
          </Link>
          <Link to="/cliente/reclamos">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<MessageSquareWarning size={16} />}
            >
              Reclamos
            </Button>
          </Link>
        </div>
      )}

      <Input
        placeholder="Buscar local o zona…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Buscar local"
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-card" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar los locales"
          description={userFacingMessage(error)}
          action={
            <Button variant="secondary" size="sm" onClick={refetch}>
              Reintentar
            </Button>
          }
        />
      ) : locales.length === 0 ? (
        <EmptyState
          icon={Store}
          title={q ? "Sin resultados" : "No hay locales abiertos"}
          description={
            q
              ? "Prueba con otra búsqueda."
              : "Vuelve más tarde, los locales abren según su horario."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locales.map((local) => (
            <LocalCard
              key={local.id}
              local={local}
              to={`${detailBase}/${local.id}`}
            />
          ))}
        </div>
      )}

      {isAuthenticated && cart.count > 0 && (
        <Link
          to="/cliente/carrito"
          className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-2 rounded-pill bg-brand-strong px-4 py-3 text-onbrand shadow-lg lg:bottom-6 lg:right-6"
        >
          <ShoppingCart size={18} aria-hidden="true" />
          <span className="text-small font-semibold">
            Ver carrito · {cart.count}
          </span>
        </Link>
      )}
    </div>
  );
}
