import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  ShoppingCart,
  Store,
  TriangleAlert,
} from "lucide-react";
import { catalogoApi, ocupacionApi } from "@/api";
import { useAuth } from "@/auth";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Spinner,
  WaitTimeBadge,
} from "@/components/ui";
import { useFetch } from "@/hooks";
import { isApiError, userFacingMessage } from "@/lib/errors";
import { useCart } from "../cart/CartContext";
import { ProductoCard } from "../components/ProductoCard";
import { ResenaList } from "../components/ResenaList";
import { OcupacionCurva } from "../components/OcupacionCurva";

/** Detalle de local: menú, tiempo estimado, ocupación (si hay sesión) y reseñas. */
export default function LocalDetailPage() {
  const { id } = useParams();
  const pdvId = Number(id);
  const { isAuthenticated } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const core = useFetch(
    () =>
      Promise.all([
        catalogoApi.getPuntoDeVenta(pdvId),
        catalogoApi.getProductos(pdvId),
        catalogoApi.getTiempoEstimado(pdvId),
      ]),
    [pdvId],
  );
  const resenas = useFetch(
    () => catalogoApi.getResenasLocal(pdvId, { size: 5 }),
    [pdvId],
  );
  const ocupacion = useFetch(
    () =>
      isAuthenticated
        ? ocupacionApi.getOcupacionCliente(pdvId)
        : Promise.resolve(null),
    [pdvId, isAuthenticated],
  );

  const backTo = isAuthenticated ? "/cliente" : "/locales";

  // Agregar al carrito exige sesión: si es anónimo, lo mandamos a login.
  function pedir(accion: () => void) {
    if (!isAuthenticated) {
      navigate("/auth/login", { state: { from: location } });
      return;
    }
    accion();
  }

  if (core.loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size={24} />
      </div>
    );
  }

  if (core.error) {
    const notFound = isApiError(core.error) && core.error.status === 404;
    return (
      <EmptyState
        icon={notFound ? Store : TriangleAlert}
        title={
          notFound
            ? "Este local no está disponible"
            : "No pudimos cargar el local"
        }
        description={
          notFound
            ? "Puede haber cerrado o ya no existe."
            : userFacingMessage(core.error)
        }
        action={
          <Link to={backTo}>
            <Button variant="secondary" size="sm">
              Volver al catálogo
            </Button>
          </Link>
        }
      />
    );
  }

  const [local, productos, tiempo] = core.data!;

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 self-start text-small font-medium text-content-secondary hover:text-content"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Locales
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-h1 font-bold text-content">{local.nombre}</h2>
          <Badge tone={local.abierto ? "success" : "neutral"}>
            {local.abierto ? "Abierto" : "Cerrado"}
          </Badge>
        </div>
        <p className="flex items-center gap-1.5 text-small text-content-secondary">
          <MapPin size={14} aria-hidden="true" />
          {local.ubicacion}
        </p>
        <div>
          <WaitTimeBadge minutes={tiempo.minutos} />
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold text-content">Menú</h3>
        {productos.length === 0 ? (
          <p className="text-small text-content-secondary">
            Este local todavía no cargó productos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {productos.map((p) => (
              <ProductoCard
                key={p.id}
                producto={p}
                cantidad={cart.cantidadDe(p.id)}
                onAdd={() => pedir(() => cart.agregar(p, pdvId, local.nombre))}
                onInc={() => cart.setCantidad(p.id, cart.cantidadDe(p.id) + 1)}
                onDec={() => cart.setCantidad(p.id, cart.cantidadDe(p.id) - 1)}
              />
            ))}
          </div>
        )}
      </section>

      {isAuthenticated && ocupacion.data && (
        <section className="flex flex-col gap-3">
          <h3 className="text-h3 font-semibold text-content">
            Ocupación de hoy
          </h3>
          <Card>
            <OcupacionCurva ocupacion={ocupacion.data} />
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold text-content">Reseñas</h3>
        <Card>
          {resenas.loading ? (
            <Spinner size={18} />
          ) : resenas.error ? (
            <p className="text-small text-content-secondary">
              No se pudieron cargar las reseñas.
            </p>
          ) : (
            <ResenaList resenas={resenas.data?.content ?? []} />
          )}
        </Card>
      </section>

      {isAuthenticated && cart.count > 0 && cart.puntoDeVentaId === pdvId && (
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
