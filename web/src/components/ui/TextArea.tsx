import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, help, className, id, rows = 3, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="ql-label">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        ref={ref}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={cn(
          'w-full resize-y rounded-input border bg-surface p-3.5 text-[15px] leading-relaxed text-ink outline-none transition',
          'placeholder:text-ink-muted focus:shadow-focus',
          error ? 'border-error-dot' : 'border-line focus:border-brand',
          className,
        )}
        {...rest}
      />
      {error ? (
        <span className="text-small text-error-fg">{error}</span>
      ) : (
        help && <span className="text-[12.5px] text-ink-muted">{help}</span>
      )}
    </div>
  );
});
