package pe.edu.utec.queueless.pago.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.pago.service.ReembolsoService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;

/**
 * Reacciona a cambios de estado del pedido para gatillar reembolsos.
 *
 * <p>Si el pedido se cancela desde un estado que ya tenía pago confirmado
 * (PAGADO_BUSCANDO_REPARTIDOR / PAGADO_ESPERANDO_COMERCIO), se emite el
 * reembolso de forma asíncrona.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PagoListener {

    private final ReembolsoService reembolsoService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onCambioEstadoPedido(PedidoEstadoCambiadoEvent event) {
        boolean esCancelacion = event.getEstadoNuevo() == EstadoPedido.CANCELADO_POR_CLIENTE
            || event.getEstadoNuevo() == EstadoPedido.CANCELADO_POR_COMERCIO;
        boolean veniaConPago = EstadoPedido.GATILLAN_REEMBOLSO.contains(event.getEstadoAnterior());

        if (esCancelacion && veniaConPago) {
            log.info("Gatillando reembolso para pedido {} (cancelación desde {})",
                event.getPedidoId(), event.getEstadoAnterior());
            reembolsoService.emitirReembolso(event.getPedidoId());
        }
    }
}
