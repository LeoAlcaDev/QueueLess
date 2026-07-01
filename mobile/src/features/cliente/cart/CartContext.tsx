import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// El carrito del cliente vive en memoria mientras dura la sesión de navegación y
// solo guarda productos de un mismo local: pedir en otro local exige vaciar primero
// (la pantalla lo confirma antes de llamar a clear). El total de QueuePoints y los
// pedidos ya creados no pasan por acá; esto es solo el "antes de pagar".

export interface CartItem {
  productoId: number;
  nombre: string;
  precio: number;
  fotoUrl: string | null;
  cantidad: number;
}

export interface PuntoRef {
  id: number;
  nombre: string;
}

export interface CartContextValue {
  items: CartItem[];
  puntoDeVentaId: number | null;
  puntoDeVentaNombre: string | null;
  count: number;
  subtotal: number;
  qtyOf: (productoId: number) => number;
  // hay items de OTRO local: agregar uno nuevo obliga a vaciar antes
  belongsToOtherPunto: (puntoDeVentaId: number) => boolean;
  add: (punto: PuntoRef, item: Omit<CartItem, 'cantidad'>, cantidad?: number) => void;
  setQty: (productoId: number, cantidad: number) => void;
  remove: (productoId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [punto, setPunto] = useState<PuntoRef | null>(null);

  // si el carrito queda vacío soltamos también el local, para que el próximo
  // producto pueda venir de donde sea sin pedir confirmación
  useEffect(() => {
    if (items.length === 0 && punto !== null) setPunto(null);
  }, [items, punto]);

  const clear = useCallback(() => {
    setItems([]);
    setPunto(null);
  }, []);

  const add = useCallback((nextPunto: PuntoRef, item: Omit<CartItem, 'cantidad'>, cantidad = 1) => {
    setPunto(nextPunto);
    setItems((prev) => {
      const existing = prev.find((it) => it.productoId === item.productoId);
      if (existing) {
        return prev.map((it) =>
          it.productoId === item.productoId ? { ...it, cantidad: it.cantidad + cantidad } : it,
        );
      }
      return [...prev, { ...item, cantidad }];
    });
  }, []);

  const setQty = useCallback((productoId: number, cantidad: number) => {
    setItems((prev) => {
      if (cantidad <= 0) return prev.filter((it) => it.productoId !== productoId);
      return prev.map((it) => (it.productoId === productoId ? { ...it, cantidad } : it));
    });
  }, []);

  const remove = useCallback((productoId: number) => {
    setItems((prev) => prev.filter((it) => it.productoId !== productoId));
  }, []);

  const qtyOf = useCallback(
    (productoId: number) => items.find((it) => it.productoId === productoId)?.cantidad ?? 0,
    [items],
  );

  const belongsToOtherPunto = useCallback(
    (puntoDeVentaId: number) => punto !== null && items.length > 0 && punto.id !== puntoDeVentaId,
    [punto, items],
  );

  const count = useMemo(() => items.reduce((sum, it) => sum + it.cantidad, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, it) => sum + it.precio * it.cantidad, 0), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      puntoDeVentaId: punto?.id ?? null,
      puntoDeVentaNombre: punto?.nombre ?? null,
      count,
      subtotal,
      qtyOf,
      belongsToOtherPunto,
      add,
      setQty,
      remove,
      clear,
    }),
    [items, punto, count, subtotal, qtyOf, belongsToOtherPunto, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
