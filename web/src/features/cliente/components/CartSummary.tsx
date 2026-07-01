import { type ReactNode } from 'react';
import { Card } from '@/components/ui';
import { formatSoles } from '@/lib/format';

interface CartSummaryProps {
  subtotal: number;
  descuento?: number;
  // etiqueta de la linea de entrega (recojo / entrega comunitaria), siempre gratis por ahora
  entregaLabel?: string;
  total: number;
  children?: ReactNode;
}

// Resumen de montos del carrito: subtotal, descuento de QueuePoints si lo hubiera, la linea
// de entrega y el total. Los botones de accion van como children.
export function CartSummary({ subtotal, descuento = 0, entregaLabel, total, children }: CartSummaryProps) {
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-small text-ink-soft">
        <span>Subtotal</span>
        <span className="font-medium tabular-nums text-ink">{formatSoles(subtotal)}</span>
      </div>
      {descuento > 0 && (
        <div className="flex items-center justify-between text-small text-points-strong">
          <span>Descuento QueuePoints</span>
          <span className="font-semibold tabular-nums">- {formatSoles(descuento)}</span>
        </div>
      )}
      {entregaLabel && (
        <div className="flex items-center justify-between text-small text-ink-soft">
          <span>{entregaLabel}</span>
          <span className="font-medium text-accent-text">Gratis</span>
        </div>
      )}
      <div className="mt-0.5 flex items-center justify-between border-t border-line pt-3">
        <span className="font-bold text-ink">Total</span>
        <span className="text-[17px] font-bold tabular-nums text-ink">{formatSoles(total)}</span>
      </div>
      {children}
    </Card>
  );
}
