import { Outlet } from 'react-router-dom';
import { CartProvider } from './cart/CartContext';

// Layout sin ruta propia que envuelve todas las pantallas del cliente con el carrito. Vive
// dentro del AppShell de la base (no arma su propio shell): solo provee el estado del
// carrito para que el catalogo, el local y el carrito compartan las mismas lineas.
export default function ClienteLayout() {
  return (
    <CartProvider>
      <Outlet />
    </CartProvider>
  );
}
