import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ProductoResponse } from '@/types';

// El carrito es local al area de cliente. Solo guarda productos de UN local a la vez (un
// pedido es siempre de un solo punto de venta) y se persiste en localStorage para que no
// se pierda al refrescar. La logica de pedir vive en la pantalla del carrito; aca solo
// manejamos las lineas y el total.

export interface CartLine {
  producto: ProductoResponse;
  cantidad: number;
}

export interface CartVendor {
  id: number;
  nombre: string;
}

interface CartState {
  vendor: CartVendor | null;
  lines: CartLine[];
}

export interface CartContextValue {
  vendor: CartVendor | null;
  lines: CartLine[];
  count: number;
  total: number;
  getQty: (productoId: number) => number;
  // agrega una unidad; si el producto es de otro local, reemplaza el carrito entero
  add: (producto: ProductoResponse, vendor: CartVendor) => void;
  setQty: (productoId: number, cantidad: number) => void;
  remove: (productoId: number) => void;
  clear: () => void;
  // true cuando el carrito ya tiene productos de un local distinto al que se mira
  isOtherVendor: (vendorId: number) => boolean;
}

const STORAGE_KEY = 'queueless.cliente.cart';
const EMPTY: CartState = { vendor: null, lines: [] };

export const CartContext = createContext<CartContextValue | null>(null);

function loadInitial(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || !Array.isArray(parsed.lines)) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // si el storage no esta disponible seguimos solo en memoria
    }
  }, [state]);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((acc, line) => acc + line.cantidad, 0);
    const total = state.lines.reduce((acc, line) => acc + line.producto.precio * line.cantidad, 0);

    const getQty = (productoId: number) => {
      const line = state.lines.find((l) => l.producto.id === productoId);
      return line ? line.cantidad : 0;
    };

    const add = (producto: ProductoResponse, vendor: CartVendor) => {
      setState((prev) => {
        // local distinto: empezamos un carrito nuevo con este producto
        if (prev.vendor && prev.vendor.id !== vendor.id) {
          return { vendor, lines: [{ producto, cantidad: 1 }] };
        }
        const existing = prev.lines.find((l) => l.producto.id === producto.id);
        if (existing) {
          const lines = prev.lines.map((l) =>
            l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l,
          );
          return { vendor, lines };
        }
        return { vendor, lines: [...prev.lines, { producto, cantidad: 1 }] };
      });
    };

    const setQty = (productoId: number, cantidad: number) => {
      setState((prev) => {
        if (cantidad <= 0) {
          const lines = prev.lines.filter((l) => l.producto.id !== productoId);
          return { vendor: lines.length ? prev.vendor : null, lines };
        }
        const lines = prev.lines.map((l) =>
          l.producto.id === productoId ? { ...l, cantidad } : l,
        );
        return { ...prev, lines };
      });
    };

    const remove = (productoId: number) => {
      setState((prev) => {
        const lines = prev.lines.filter((l) => l.producto.id !== productoId);
        return { vendor: lines.length ? prev.vendor : null, lines };
      });
    };

    const clear = () => setState(EMPTY);

    const isOtherVendor = (vendorId: number) =>
      Boolean(state.vendor && state.vendor.id !== vendorId && state.lines.length > 0);

    return {
      vendor: state.vendor,
      lines: state.lines,
      count,
      total,
      getQty,
      add,
      setQty,
      remove,
      clear,
      isOtherVendor,
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
