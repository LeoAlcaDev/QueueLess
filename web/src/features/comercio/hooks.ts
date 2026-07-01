// Datos compartidos por varias pantallas del comercio. La lista de locales la piden el
// selector de productos, la ocupacion y el formulario de productos, asi que la centralizamos.
import { endpoints, http } from '@/api';
import { useApi } from '@/hooks';
import type { PuntoDeVentaResponse } from '@/types';

export function useStores() {
  return useApi<PuntoDeVentaResponse[]>(
    (signal) => http.get(endpoints.comercio.puntosDeVenta.base, { signal }),
    [],
  );
}
