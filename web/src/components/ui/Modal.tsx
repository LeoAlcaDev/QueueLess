import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Pie con acciones (botones). */
  footer?: ReactNode;
  /** En móvil se ancla abajo como sheet; en desktop, centrado. */
  className?: string;
}

/** Diálogo modal responsive: bottom-sheet en móvil, centrado en desktop.
 *  Cierra con Escape o click en el overlay. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex w-full max-h-[90vh] flex-col overflow-hidden bg-surface shadow-lg",
          "rounded-t-modal sm:max-w-md sm:rounded-modal",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-h3 font-semibold text-content">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-9 w-9 place-items-center rounded-pill text-content-secondary hover:bg-surface-muted focus-visible:shadow-focus focus-visible:outline-none"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-line p-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
