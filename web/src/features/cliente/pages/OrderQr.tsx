import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { http, endpoints } from '@/api';
import { useApi } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Card, Skeleton, StateBanner, StatusPill } from '@/components/ui';
import { paths } from '@/routes/paths';
import { formatSoles } from '@/lib/format';
import type { PedidoResponse, PuntoDeVentaResponse } from '@/types';
import { BackLink, ErrorState } from '../components';

export default function OrderQr() {
  const { id = '' } = useParams();
  usePageChrome('QR de entrega', { maxWidth: 560 });

  const detalle = useApi<PedidoResponse>(
    (signal) => http.get(endpoints.cliente.pedidos.detail(id), { signal }),
    [id],
  );
  const locales = useApi<PuntoDeVentaResponse[]>(
    (signal) => http.get(endpoints.puntosDeVenta.list, { signal }),
    [],
  );
  const qr = useApi<Blob>((signal) => http.getBlob(endpoints.cliente.pedidos.qr(id), { signal }), [id]);

  // el blob se vuelve un object URL para el <img>; lo liberamos al desmontar o recargar
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!qr.data) return;
    const url = URL.createObjectURL(qr.data);
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
      setSrc(null);
    };
  }, [qr.data]);

  const pedido = detalle.data;
  const nombreLocal = useMemo(() => {
    if (!pedido) return undefined;
    return (locales.data ?? []).find((l) => l.id === pedido.puntoDeVentaId)?.nombre;
  }, [locales.data, pedido]);

  return (
    <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-5">
      <div className="w-full">
        <BackLink to={id ? paths.cliente.pedido(id) : paths.cliente.pedidos} />
      </div>

      {/* el QR solo es válido cuando el pedido está listo; si no, el backend responde 422 */}
      {qr.error ? (
        qr.error.kind === 'businessRule' ? (
          <StateBanner tone="warning" title="Todavía no hay QR" className="w-full">
            {qr.error.message}
          </StateBanner>
        ) : (
          <ErrorState error={qr.error} onRetry={qr.refetch} title="No pudimos cargar el QR" />
        )
      ) : (
        <>
          {pedido && <StatusPill estado={pedido.estado} />}

          <div className="grid place-items-center rounded-card border border-line bg-surface p-5">
            {qr.loading || !src ? (
              <Skeleton width={240} height={240} rounded="rounded-card" />
            ) : (
              <img src={src} alt="Código QR del pedido" width={240} height={240} className="rounded-card" />
            )}
          </div>

          {pedido && (
            <div className="font-mono text-h2 font-bold tracking-wider text-ink">{pedido.codigo}</div>
          )}

          {pedido && (
            <p className="text-center text-small text-ink-soft">
              Muestra este código al recoger en{' '}
              <span className="font-bold text-ink">{nombreLocal ?? `Local #${pedido.puntoDeVentaId}`}</span>.
            </p>
          )}

          {pedido && pedido.items.length > 0 && (
            <Card pad="sm" className="w-full">
              <div className="flex flex-col gap-1.5">
                {pedido.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-small">
                    <span className="text-ink-soft">
                      <span className="font-bold tabular-nums text-ink">{item.cantidad}×</span> {item.nombre}
                    </span>
                    <span className="tabular-nums text-ink">{formatSoles(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
