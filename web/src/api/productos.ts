import { http } from "./client";
import type {
  ActualizarProductoRequest,
  CambiarDisponibilidadRequest,
  CrearProductoRequest,
  ProductoResponse,
} from "@/types";

// CRUD de productos del comercio (MAPA-FRONTEND §3.8).

/** El query puntoDeVentaId es OBLIGATORIO. */
export function listProductos(
  puntoDeVentaId: number,
): Promise<ProductoResponse[]> {
  return http.get<ProductoResponse[]>("/api/v1/comercio/productos", {
    params: { puntoDeVentaId },
  });
}

export function crearProducto(
  body: CrearProductoRequest,
): Promise<ProductoResponse> {
  return http.post<ProductoResponse>("/api/v1/comercio/productos", body);
}

export function updateProducto(
  id: number,
  body: ActualizarProductoRequest,
): Promise<ProductoResponse> {
  return http.put<ProductoResponse>(`/api/v1/comercio/productos/${id}`, body);
}

export function cambiarDisponibilidad(
  id: number,
  body: CambiarDisponibilidadRequest,
): Promise<ProductoResponse> {
  return http.patch<ProductoResponse>(
    `/api/v1/comercio/productos/${id}/disponibilidad`,
    body,
  );
}

export function eliminarProducto(id: number): Promise<void> {
  return http.del(`/api/v1/comercio/productos/${id}`);
}

/** Foto del producto: multipart, parte `file`, ≤2MB jpg/png/webp. */
export function subirFoto(id: number, file: File): Promise<ProductoResponse> {
  const form = new FormData();
  form.append("file", file);
  return http.postForm<ProductoResponse>(
    `/api/v1/comercio/productos/${id}/foto`,
    form,
  );
}
