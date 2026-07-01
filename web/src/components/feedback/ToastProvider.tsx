import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toast, type ToastTone } from '@/components/ui/Toast';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: ReactNode;
}

export interface ToastApi {
  show: (message: ReactNode, tone?: ToastTone) => void;
  success: (message: ReactNode) => void;
  error: (message: ReactNode) => void;
  info: (message: ReactNode) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

const DURATION = 3500;

// Maneja la cola de toasts y sus timers. Cualquier pantalla pide un toast con useToast;
// se apilan abajo al centro y se van solos.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: ReactNode, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, message }]);
      window.setTimeout(() => remove(id), DURATION);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
      info: (message) => show(message, 'info'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast tone={t.tone} onClose={() => remove(t.id)}>
                {t.message}
              </Toast>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
