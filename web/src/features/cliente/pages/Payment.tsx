import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { http, endpoints } from '@/api';
import { useAsyncAction, useToast } from '@/hooks';
import { usePageChrome } from '@/components/layout';
import { Button, Card, Icon, Price, Skeleton, StateBanner } from '@/components/ui';
import { paths } from '@/routes/paths';
import { formatSoles } from '@/lib/format';
import type { IniciarPagoResponse, PagoResponse } from '@/types';
import { BackLink } from '../components';

export default function Payment() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  usePageChrome('Pago', { maxWidth: 560 });

  const [pago, setPago] = useState<IniciarPagoResponse | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [fallo, setFallo] = useState(false);
  const iniciado = useRef(false);

  const iniciar = useAsyncAction((pedidoId: number) =>
    http.post<IniciarPagoResponse>(endpoints.cliente.pagos.iniciar, { pedidoId }),
  );

  // El gateway mock no abre una pasarela externa: su "checkout" es el webhook que confirma el
  // pago. Lo llamamos por POST desde aca y el sondeo de abajo detecta la confirmacion.
  const confirmarMock = useAsyncAction((webhookPath: string) =>
    http.post<PagoResponse>(webhookPath, null),
  );

  // arrancamos el pago una sola vez al entrar; el ref evita el doble disparo en dev
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    iniciar.run(Number(id)).then((res) => {
      if (res) setPago(res);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mientras el pago no se confirme, consultamos su estado cada pocos segundos
  useEffect(() => {
    if (!pago || confirmado) return;
    let cancelado = false;

    const consultar = async () => {
      try {
        const res = await http.get<PagoResponse>(endpoints.cliente.pagos.detail(pago.pagoId));
        if (cancelado) return;
        if (res.estado === 'CONFIRMADO') {
          setConfirmado(true);
          toast.success('Pago confirmado.');
          navigate(paths.cliente.seguimiento(id));
        } else if (res.estado === 'FALLIDO') {
          setFallo(true);
        }
      } catch {
        // un fallo puntual de red no corta el sondeo; reintenta en el próximo tick
      }
    };

    consultar();
    const intervalo = setInterval(consultar, 3000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [pago, confirmado, id, navigate, toast]);

  const reintentarIniciar = async () => {
    setFallo(false);
    const res = await iniciar.run(Number(id));
    if (res) setPago(res);
  };

  // 409: ya hay un pago iniciado para este pedido; ofrecemos seguir desde el pedido
  const conflicto = iniciar.error && iniciar.error.kind === 'conflict';

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-4">
      <BackLink to={paths.cliente.pedido(id)} />

      {!pago && iniciar.loading && (
        <Card className="flex flex-col gap-3">
          <Skeleton width="45%" height={16} />
          <Skeleton height={36} width="60%" />
          <Skeleton height={48} rounded="rounded-input" />
        </Card>
      )}

      {!pago && iniciar.error && (
        <div className="flex flex-col gap-3">
          <StateBanner
            tone={conflicto ? 'warning' : 'error'}
            title={conflicto ? 'Este pedido ya tiene un pago iniciado' : 'No pudimos iniciar el pago'}
          >
            {iniciar.error.message}
          </StateBanner>
          <div className="flex gap-2.5">
            <Link to={paths.cliente.pedido(id)} className="flex-1">
              <Button full variant="secondary">
                Volver al pedido
              </Button>
            </Link>
            {!conflicto && (
              <Button full icon="refresh" loading={iniciar.loading} onClick={reintentarIniciar}>
                Reintentar
              </Button>
            )}
          </div>
        </div>
      )}

      {pago && (
        <>
          <Card className="flex flex-col gap-4">
            <span className="ql-section-label">Total a pagar</span>
            <div className="flex items-baseline justify-between">
              <span className="text-small text-ink-soft">Tu pedido</span>
              <Price amount={pago.monto} className="text-display" />
            </div>

            {fallo ? (
              <StateBanner tone="error" title="No pudimos procesar el pago">
                Revisa tu tarjeta e inténtalo de nuevo.
              </StateBanner>
            ) : (
              <div className="flex items-center gap-2.5 rounded-input bg-info-bg p-3.5 text-small text-info-fg">
                <Icon name="lock" size={18} className="shrink-0" />
                Pago seguro. Se confirma en segundos; el comercio recibe tu pedido al instante.
              </div>
            )}
          </Card>

          {pago.urlCheckout.startsWith('http') ? (
            // pasarela externa real (MercadoPago): se paga en su sitio, en otra pestaña
            <a href={pago.urlCheckout} target="_blank" rel="noreferrer">
              <Button full icon="creditCard">
                Pagar {formatSoles(pago.monto)}
              </Button>
            </a>
          ) : (
            // flujo mock: confirmamos el pago llamando a su webhook
            <Button
              full
              icon="creditCard"
              loading={confirmarMock.loading}
              onClick={() => confirmarMock.run(pago.urlCheckout.replace(/^\/api/, ''))}
            >
              Pagar {formatSoles(pago.monto)}
            </Button>
          )}

          {fallo ? (
            <Button full variant="secondary" icon="refresh" onClick={reintentarIniciar}>
              Reintentar pago
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-small text-ink-muted">
              <Icon name="clock" size={15} />
              Esperando la confirmación de la pasarela…
            </div>
          )}
        </>
      )}
    </div>
  );
}
