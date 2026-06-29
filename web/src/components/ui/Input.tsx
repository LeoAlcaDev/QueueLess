import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Etiqueta visible encima del campo. */
  label?: ReactNode;
  /** Mensaje de error inline (pinta el borde de error y se anuncia a lectores). */
  error?: string;
  /** Texto de ayuda bajo el campo (cuando no hay error). */
  hint?: string;
}

/** Campo de texto con label y error inline (label + error de MAPA §7.1 400). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedById = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-small font-medium text-content-secondary"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          "h-12 w-full rounded-input border bg-surface px-3.5 text-body text-content",
          "placeholder:text-content-muted",
          "focus-visible:shadow-focus focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-error-dot" : "border-line",
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={describedById} className="text-small text-error-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={describedById} className="text-small text-content-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
