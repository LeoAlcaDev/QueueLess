import { useEffect, useState, type ReactNode } from 'react';
import { endpoints, http } from '@/api';
import { useAsyncAction, useToast } from '@/hooks';
import { Button, Chip } from '@/components/ui';
import type { MotivoCancelacionRequest, PedidoResponse } from '@/types';
import { RejectModal } from './RejectModal';
import { CodeEntryModal } from './CodeEntryModal';

interface OrderActionsProps {
  pedido: PedidoResponse;
  onChanged: () => void;
  size?: 'sm' | 'md';
  // en el detalle ofrecemos ademas cancelar el pedido ya aceptado
  context?: 'queue' | 'detail';
}

interface Tarea {
  run: () => Promise<unknown>;
  success: string;
}

type ModalKind = null | 'reject' | 'cancel' | 'code';

// estados en los que el comercio puede cancelar un pedido ya aceptado (el rechazo va antes,
// cuando todavia esta esperando al comercio)
const CANCELABLES = new Set<PedidoResponse['estado']>([
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO_PARA_RECOGER',
  'LISTO_PARA_DELIVERY',
]);

// Botones de accion del pedido segun su estado. Centraliza las transiciones (aceptar,
// rechazar, preparar, listo, entregar, cancelar) para que la cola y el detalle se comporten
// igual. Cada accion corre con useAsyncAction, avisa por toast y refresca al terminar. Los
// botones van en una grilla de columnas iguales para que entren dentro de la card sin
// desbordarse.
export function OrderActions({ pedido, onChanged, size = 'sm', context = 'queue' }: OrderActionsProps) {
  const toast = useToast();
  const [modal, setModal] = useState<ModalKind>(null);

  const action = useAsyncAction(async (tarea: Tarea) => {
    await tarea.run();
    toast.success(tarea.success);
    onChanged();
    return true;
  });

  // los errores (incluido el 422 con su mensaje del backend) se muestran tal cual
  useEffect(() => {
    if (action.error) toast.error(action.error.message);
  }, [action.error, toast]);

  const id = pedido.id;
  const { loading } = action;

  const correr = (tarea: Tarea) => action.run(tarea);

  // para las acciones con modal: corre y cierra el modal solo si salio bien
  const correrYcerrar = async (tarea: Tarea) => {
    const ok = await action.run(tarea);
    if (ok) setModal(null);
  };

  const rechazar = (data: MotivoCancelacionRequest) =>
    correrYcerrar({
      run: () => http.post(endpoints.comercio.pedidos.rechazar(id), data),
      success: 'Pedido rechazado',
    });

  const cancelar = (data: MotivoCancelacionRequest) =>
    correrYcerrar({
      run: () => http.post(endpoints.comercio.pedidos.cancelar(id), data),
      success: 'Pedido cancelado',
    });

  const confirmarEntrega = (codigo: string) =>
    correrYcerrar({
      run: () => http.post(endpoints.comercio.pedidos.marcarEntregado(id), { codigo }),
      success: 'Entrega confirmada',
    });

  // se construye la lista de botones (a ancho completo) y, aparte, el aviso de espera cuando
  // no hay accion del comercio (esperando al repartidor)
  const botones: ReactNode[] = [];
  let espera: ReactNode = null;

  switch (pedido.estado) {
    case 'PAGADO_ESPERANDO_COMERCIO':
      botones.push(
        <Button key="rechazar" size={size} variant="destructive" full disabled={loading} onClick={() => setModal('reject')}>
          Rechazar
        </Button>,
      );
      botones.push(
        <Button
          key="aceptar"
          size={size}
          icon="check"
          full
          loading={loading}
          onClick={() => correr({ run: () => http.post(endpoints.comercio.pedidos.aceptar(id)), success: 'Pedido aceptado' })}
        >
          Aceptar
        </Button>,
      );
      break;
    case 'ACEPTADO':
      botones.push(
        <Button
          key="preparar"
          size={size}
          icon="handPlatter"
          full
          loading={loading}
          onClick={() => correr({ run: () => http.post(endpoints.comercio.pedidos.iniciarPreparacion(id)), success: 'Preparación iniciada' })}
        >
          Iniciar preparación
        </Button>,
      );
      break;
    case 'EN_PREPARACION':
      botones.push(
        <Button
          key="listo"
          size={size}
          icon="checkCheck"
          full
          loading={loading}
          onClick={() => correr({ run: () => http.post(endpoints.comercio.pedidos.marcarListo(id)), success: 'Pedido listo' })}
        >
          Marcar listo
        </Button>,
      );
      break;
    case 'LISTO_PARA_RECOGER':
      botones.push(
        <Button key="entregar" size={size} icon="qr" full disabled={loading} onClick={() => setModal('code')}>
          Marcar entregado
        </Button>,
      );
      break;
    case 'LISTO_PARA_DELIVERY':
      espera = (
        <Chip tone="info" icon="bike">
          Esperando al repartidor
        </Chip>
      );
      break;
    default:
      break;
  }

  // en el detalle, un pedido ya aceptado todavia puede cancelarse
  if (context === 'detail' && CANCELABLES.has(pedido.estado)) {
    botones.push(
      <Button key="cancelar" size={size} variant="ghost" full disabled={loading} onClick={() => setModal('cancel')}>
        Cancelar pedido
      </Button>,
    );
  }

  const columnas = Math.min(botones.length, 2);

  return (
    <>
      {espera && <div className="text-small text-ink-muted">{espera}</div>}
      {botones.length > 0 && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
        >
          {botones}
        </div>
      )}

      <RejectModal
        open={modal === 'reject'}
        onClose={() => setModal(null)}
        onConfirm={rechazar}
        loading={loading}
        title="Rechazar pedido"
        description="El cliente recibirá el reembolso automáticamente."
        confirmLabel="Rechazar"
      />
      <RejectModal
        open={modal === 'cancel'}
        onClose={() => setModal(null)}
        onConfirm={cancelar}
        loading={loading}
        title="Cancelar pedido"
        description="Cancela un pedido que ya habías aceptado. Se reembolsará al cliente."
        confirmLabel="Cancelar pedido"
      />
      <CodeEntryModal
        open={modal === 'code'}
        onClose={() => setModal(null)}
        onConfirm={confirmarEntrega}
        loading={loading}
      />
    </>
  );
}
