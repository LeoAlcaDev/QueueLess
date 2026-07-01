import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// Guarda cuál es la entrega que el repartidor tiene en curso. La acepta en
// Disponibles, la trabaja en Activa y la cierra en Confirmar entrega; al terminar
// se limpia. Vive como contexto porque tres tabs distintas la necesitan.
interface RepartidorContextValue {
  activeSolicitudId: number | null;
  setActive: (id: number) => void;
  clearActive: () => void;
}

const RepartidorContext = createContext<RepartidorContextValue | null>(null);

export function RepartidorProvider({ children }: { children: ReactNode }) {
  const [activeSolicitudId, setActiveSolicitudId] = useState<number | null>(null);

  const setActive = useCallback((id: number) => setActiveSolicitudId(id), []);
  const clearActive = useCallback(() => setActiveSolicitudId(null), []);

  const value = useMemo<RepartidorContextValue>(
    () => ({ activeSolicitudId, setActive, clearActive }),
    [activeSolicitudId, setActive, clearActive],
  );

  return <RepartidorContext.Provider value={value}>{children}</RepartidorContext.Provider>;
}

export function useRepartidor(): RepartidorContextValue {
  const ctx = useContext(RepartidorContext);
  if (!ctx) throw new Error('useRepartidor debe usarse dentro de RepartidorProvider');
  return ctx;
}
