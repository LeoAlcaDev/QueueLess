import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductoResponse } from "@/types";

export interface CartLine {
  producto: ProductoResponse;
  cantidad: number;
}

interface CartState {
  puntoDeVentaId: number | null;
  puntoDeVentaNombre: string | null;
  lines: Record<number, CartLine>;
}

interface CartContextValue {
  puntoDeVentaId: number | null;
  puntoDeVentaNombre: string | null;
  lines: CartLine[];
  count: number;
  subtotal: number;
  cantidadDe: (productoId: number) => number;
  /** Agrega 1 unidad. Si el producto es de otro local, reemplaza el carrito. */
  agregar: (
    producto: ProductoResponse,
    pdvId: number,
    pdvNombre: string,
  ) => void;
  setCantidad: (productoId: number, cantidad: number) => void;
  quitar: (productoId: number) => void;
  vaciar: () => void;
}

const STORAGE_KEY = "queueless.cart";
const EMPTY: CartState = {
  puntoDeVentaId: null,
  puntoDeVentaNombre: null,
  lines: {},
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function load(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartState) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Carrito del cliente: un pedido = un local. Persiste en localStorage para
 *  sobrevivir el ida y vuelta a login. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const agregar = useCallback(
    (producto: ProductoResponse, pdvId: number, pdvNombre: string) => {
      setState((prev) => {
        // Cambió de local → empezar carrito nuevo.
        const base =
          prev.puntoDeVentaId === pdvId
            ? prev
            : {
                puntoDeVentaId: pdvId,
                puntoDeVentaNombre: pdvNombre,
                lines: {},
              };
        const actual = base.lines[producto.id]?.cantidad ?? 0;
        return {
          puntoDeVentaId: pdvId,
          puntoDeVentaNombre: pdvNombre,
          lines: {
            ...base.lines,
            [producto.id]: { producto, cantidad: actual + 1 },
          },
        };
      });
    },
    [],
  );

  const setCantidad = useCallback((productoId: number, cantidad: number) => {
    setState((prev) => {
      const line = prev.lines[productoId];
      if (!line) return prev;
      const lines = { ...prev.lines };
      if (cantidad <= 0) delete lines[productoId];
      else lines[productoId] = { ...line, cantidad };
      const vacio = Object.keys(lines).length === 0;
      return vacio ? EMPTY : { ...prev, lines };
    });
  }, []);

  const quitar = useCallback(
    (productoId: number) => setCantidad(productoId, 0),
    [setCantidad],
  );
  const vaciar = useCallback(() => setState(EMPTY), []);

  const value = useMemo<CartContextValue>(() => {
    const lines = Object.values(state.lines);
    return {
      puntoDeVentaId: state.puntoDeVentaId,
      puntoDeVentaNombre: state.puntoDeVentaNombre,
      lines,
      count: lines.reduce((acc, l) => acc + l.cantidad, 0),
      subtotal: lines.reduce(
        (acc, l) => acc + l.cantidad * l.producto.precio,
        0,
      ),
      cantidadDe: (productoId: number) =>
        state.lines[productoId]?.cantidad ?? 0,
      agregar,
      setCantidad,
      quitar,
      vaciar,
    };
  }, [state, agregar, setCantidad, quitar, vaciar]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
