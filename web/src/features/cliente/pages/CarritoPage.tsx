import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { pedidosClienteApi } from "@/api";
import {
  Button,
  Card,
  EmptyState,
  Input,
  PickupDeliveryToggle,
  useToast,
  type TipoEntrega,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { isApiError, userFacingMessage } from "@/lib/errors";
import { formatSoles } from "@/lib/format";
import { useCart } from "../cart/CartContext";

/** Armar pedido: items, tipo de entrega, zona/programado y crear (POST /cliente/pedidos). */
export default function CarritoPage() {
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>("PICKUP");
  const [zonaEntrega, setZonaEntrega] = useState("");
  const [programado, setProgramado] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Tu carrito está vacío"
        description="Agrega productos desde un local para armar tu pedido."
        action={
          <Link to="/cliente">
            <Button size="sm">Explorar locales</Button>
          </Link>
        }
      />
    );
  }

  async function crear() {
    if (tipoEntrega === "DELIVERY" && !zonaEntrega.trim()) {
      toast.error("Indicá la zona de entrega.");
      return;
    }
    setSubmitting(true);
    try {
      const pedido = await pedidosClienteApi.crearPedido({
        puntoDeVentaId: cart.puntoDeVentaId!,
        tipoEntrega,
        zonaEntrega:
          tipoEntrega === "DELIVERY" ? zonaEntrega.trim() : undefined,
        recojoProgramadoAt:
          tipoEntrega === "PICKUP" && programado
            ? new Date(programado).toISOString()
            : undefined,
        items: cart.lines.map((l) => ({
          productoId: l.producto.id,
          cantidad: l.cantidad,
        })),
      });
      cart.vaciar();
      navigate(`/cliente/pedidos/${pedido.id}`, { replace: true });
    } catch (err) {
      if (isApiError(err) && err.status === 404) {
        // El local o un producto ya no está: avisar y volver al local para refrescar.
        toast.error(
          "El local o algún producto cambió. Revisa el menú de nuevo.",
        );
        if (cart.puntoDeVentaId)
          navigate(`/cliente/locales/${cart.puntoDeVentaId}`);
      } else {
        // 422: cerrado / no disponible / horario / programado → mensaje del backend.
        toast.error(userFacingMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const btn =
    "grid h-8 w-8 place-items-center rounded-pill border border-line text-content hover:bg-surface-muted focus-visible:shadow-focus focus-visible:outline-none";

  return (
    <div className="flex flex-col gap-5">
      {cart.puntoDeVentaNombre && (
        <p className="text-small text-content-secondary">
          Pedido en{" "}
          <span className="font-semibold text-content">
            {cart.puntoDeVentaNombre}
          </span>
        </p>
      )}

      <Card className="flex flex-col divide-y divide-line">
        {cart.lines.map((l) => (
          <div
            key={l.producto.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-content">
                {l.producto.nombre}
              </p>
              <p className="text-small text-content-secondary">
                {formatSoles(l.producto.precio)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cart.setCantidad(l.producto.id, l.cantidad - 1)}
                aria-label={`Quitar una unidad de ${l.producto.nombre}`}
                className={btn}
              >
                <Minus size={14} aria-hidden="true" />
              </button>
              <span className="min-w-5 text-center text-body font-semibold">
                {l.cantidad}
              </span>
              <button
                type="button"
                onClick={() => cart.setCantidad(l.producto.id, l.cantidad + 1)}
                aria-label={`Agregar una unidad de ${l.producto.nombre}`}
                className={btn}
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
            <span className="w-20 shrink-0 text-right text-body font-semibold text-content">
              {formatSoles(l.producto.precio * l.cantidad)}
            </span>
            <button
              type="button"
              onClick={() => cart.quitar(l.producto.id)}
              aria-label={`Eliminar ${l.producto.nombre}`}
              className="shrink-0 text-content-muted hover:text-error-fg focus-visible:shadow-focus focus-visible:outline-none"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </Card>

      <section className="flex flex-col gap-3">
        <h3 className="text-h3 font-semibold text-content">
          ¿Cómo lo quieres?
        </h3>
        <PickupDeliveryToggle value={tipoEntrega} onChange={setTipoEntrega} />
        {tipoEntrega === "DELIVERY" ? (
          <Input
            label="Zona de entrega"
            placeholder="Ej. Cancha Polideportiva"
            value={zonaEntrega}
            onChange={(e) => setZonaEntrega(e.target.value)}
            required
          />
        ) : (
          <Input
            label="Programar recojo (opcional)"
            type="datetime-local"
            value={programado}
            onChange={(e) => setProgramado(e.target.value)}
            hint="Dejalo vacío para pedir ahora."
          />
        )}
      </section>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <span className="text-body font-semibold text-content">Total</span>
        <span className="text-h3 font-bold text-content">
          {formatSoles(cart.subtotal)}
        </span>
      </div>

      <Button
        full
        loading={submitting}
        onClick={crear}
        className={cn("sticky bottom-20 lg:static")}
      >
        Crear pedido
      </Button>
    </div>
  );
}
