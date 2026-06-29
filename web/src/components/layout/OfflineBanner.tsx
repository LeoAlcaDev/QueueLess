import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks";

/**
 * Aviso global cuando el navegador pierde conexión. Sticky bajo el header para
 * que el usuario entienda por qué las acciones pueden fallar (estado offline).
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-warning-bg px-4 py-2 text-small font-medium text-warning-fg"
    >
      <WifiOff size={15} aria-hidden="true" />
      Sin conexión. Algunas acciones no estarán disponibles hasta que vuelvas a
      tener internet.
    </div>
  );
}
