import { useContext } from 'react';
import { CartContext } from './CartContext';

// Acceso al carrito del cliente. Tiene que usarse dentro de <CartProvider>, que el layout
// del area monta una sola vez.
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
