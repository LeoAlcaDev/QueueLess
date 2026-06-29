import { cn } from "@/lib/cn";

interface ChipMultiSelectProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  /** Etiqueta legible por opción (por defecto, el valor crudo). */
  labelFor?: (option: T) => string;
}

/** Grupo de chips de selección múltiple (alérgenos, restricciones, etc.). */
export function ChipMultiSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  labelFor,
}: ChipMultiSelectProps<T>) {
  function toggle(option: T) {
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option],
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-small font-medium text-content-secondary">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option)}
              className={cn(
                "rounded-pill border px-3 py-1.5 text-small font-medium",
                "focus-visible:shadow-focus focus-visible:outline-none",
                selected
                  ? "border-brand bg-brand-soft text-content-brand"
                  : "border-line text-content-secondary hover:bg-surface-muted",
              )}
            >
              {labelFor ? labelFor(option) : option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
