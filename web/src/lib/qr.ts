import { API_URL } from "@/api/client";
import { ApiError } from "./errors";
import { getAccessToken } from "./storage";

// El <img src="endpoint"> no manda headers; el QR exige Authorization. Hay que
// hacer fetch del PNG con el Bearer y mostrarlo como blob URL (MAPA-FRONTEND §8.4).

/**
 * Descarga el QR de un pedido como object URL (image/png). El llamador debe
 * liberar la URL con `revokeBlobUrl` (o URL.revokeObjectURL) al desmontar.
 */
export async function fetchQrBlobUrl(pedidoId: number): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/cliente/pedidos/${pedidoId}/qr`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
  });
  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      message:
        res.status === 404
          ? "El QR no está disponible."
          : "No se pudo cargar el QR.",
    });
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function revokeBlobUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}
