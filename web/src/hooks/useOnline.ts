import { useEffect, useState } from "react";

/**
 * Sigue el estado de conexión del navegador (`navigator.onLine` + eventos
 * online/offline). Sirve para avisar globalmente cuando se pierde internet,
 * sin esperar a que falle una petición.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}
