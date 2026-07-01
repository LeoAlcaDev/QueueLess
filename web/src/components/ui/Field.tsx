import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
  // texto suave a la derecha del label, por ejemplo "min. 8 caracteres"
  hint?: string;
  prefix?: string;
  right?: ReactNode;
}

// Campo de texto que reenvia la ref y reparte el resto de props al input, asi encaja
// directo con el register de react-hook-form. Si el type es password, agrega el ojo.
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, help, hint, prefix, right, type = 'text', className, id, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const realType = isPassword ? (show ? 'text' : 'password') : type;
  const inputId = id ?? rest.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="ql-label flex justify-between">
          <span>{label}</span>
          {hint && <span className="font-normal text-ink-muted">{hint}</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 text-[15px] font-semibold text-ink-muted">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          type={realType}
          aria-invalid={Boolean(error)}
          className={cn(
            'h-12 w-full rounded-input border bg-surface text-[15px] text-ink outline-none transition',
            'placeholder:text-ink-muted focus:shadow-focus disabled:bg-surface-muted',
            error ? 'border-error-dot' : 'border-line focus:border-brand',
            prefix ? 'pl-8' : 'pl-3.5',
            isPassword || right ? 'pr-10' : 'pr-3.5',
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 grid place-items-center text-ink-muted"
          >
            <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
        {!isPassword && right && <div className="absolute right-3">{right}</div>}
      </div>
      {error ? (
        <div className="flex items-center gap-1 text-small text-error-fg">
          <Icon name="alertCircle" size={13} />
          {error}
        </div>
      ) : (
        help && <div className="text-[12.5px] text-ink-muted">{help}</div>
      )}
    </div>
  );
});
