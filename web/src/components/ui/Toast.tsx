import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TONE_STYLES: Record<ToastTone, { wrap: string; icon: typeof Info }> = {
  success: { wrap: "border-l-success-dot", icon: CheckCircle2 },
  error: { wrap: "border-l-error-dot", icon: AlertCircle },
  info: { wrap: "border-l-info-dot", icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, message }]);
      window.setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m) => toast(m, "success"),
      error: (m) => toast(m, "error"),
      info: (m) => toast(m, "info"),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0">
          {toasts.map(({ id, tone, message }) => {
            const { wrap, icon: Icon } = TONE_STYLES[tone];
            return (
              <div
                key={id}
                role="status"
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-card border border-line border-l-4 bg-surface p-3 shadow-lg",
                  wrap,
                )}
              >
                <Icon
                  size={18}
                  className="mt-0.5 shrink-0 text-content-secondary"
                  aria-hidden="true"
                />
                <p className="flex-1 text-small text-content">{message}</p>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  aria-label="Cerrar"
                  className="shrink-0 text-content-muted hover:text-content focus-visible:shadow-focus focus-visible:outline-none"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
