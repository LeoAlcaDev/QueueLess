import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastProps {
  tone?: ToastTone;
  children: ReactNode;
  onClose?: () => void;
}

const TONES: Record<ToastTone, { icon: IconName; color: string }> = {
  success: { icon: 'checkCircle', color: 'text-success-dot' },
  error: { icon: 'alertCircle', color: 'text-error-dot' },
  info: { icon: 'info', color: 'text-info-dot' },
};

// Pieza visual del toast. La cola y los timers viven en ToastProvider; esto solo pinta.
export function Toast({ tone = 'success', children, onClose }: ToastProps) {
  const t = TONES[tone];
  return (
    <div
      className="flex max-w-sm items-center gap-2.5 rounded-input bg-ink px-3.5 py-3 text-surface shadow-lg"
      style={{ animation: 'ql-toast-in 180ms ease' }}
      role="status"
    >
      <Icon name={t.icon} size={18} className={cn('shrink-0', t.color)} />
      <span className="flex-1 text-small font-medium leading-snug">{children}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid place-items-center opacity-60 hover:opacity-100"
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
}
