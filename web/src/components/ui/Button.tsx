import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "destructive" | "points";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** primary (marca sólida) · secondary (borde) · ghost (sin fondo) · destructive (rojo) · points (morado). */
  variant?: ButtonVariant;
  /** Altura: md = 48px, sm = 38px. */
  size?: ButtonSize;
  /** Ocupa el ancho del contenedor. */
  full?: boolean;
  /** Muestra spinner y bloquea el click (evita doble-submit). */
  loading?: boolean;
  /** Ícono opcional antes del texto. */
  leftIcon?: ReactNode;
  children?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-strong text-onbrand border-transparent hover:bg-brand-hover",
  secondary: "bg-surface text-content border-line hover:bg-surface-muted",
  ghost:
    "bg-transparent text-content-brand border-transparent hover:bg-brand-soft",
  destructive: "bg-error-dot text-white border-transparent hover:opacity-90",
  points: "bg-points text-white border-transparent hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-12 text-body",
  sm: "h-[38px] text-small",
};

/** Botón de acción QueueLess. Sentence case, verbo en imperativo. Sigue la marca activa. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      full = false,
      loading = false,
      disabled,
      leftIcon,
      children,
      className,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const isOff = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isOff}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-button border px-5 font-semibold",
          "transition-[transform,background-color,opacity] duration-150 ease-out",
          "focus-visible:shadow-focus focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          VARIANTS[variant],
          SIZES[size],
          full && "w-full",
          className,
        )}
        {...rest}
      >
        {loading && <Spinner size={size === "sm" ? 14 : 16} />}
        {!loading && leftIcon}
        {children}
      </button>
    );
  },
);
