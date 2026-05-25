package pe.edu.utec.queueless.delivery.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.service.PedidoService;

/**
 * Cuando un pedido tipo DELIVERY transiciona a ACEPTADO (el comercio lo aceptó
 * después de que el pago fue confirmado), crea automáticamente la
 * SolicitudDelivery para que el matching empiece a buscar repartidor.
 *
 * <p>El service es idempotente, así que si el evento se procesara dos veces no
 * se crearían dos solicitudes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CrearSolicitudDeliveryListener {

    private final SolicitudDeliveryService solicitudDeliveryService;
    private final PedidoService pedidoService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onPedidoAceptado(PedidoEstadoCambiadoEvent event) {
        if (event.getEstadoNuevo() != EstadoPedido.ACEPTADO) {
            return;
        }
        Pedido pedido = pedidoService.findById(event.getPedidoId());
        if (pedido.getTipoEntrega() != TipoEntrega.DELIVERY) {
            return;
        }
        solicitudDeliveryService.crearParaPedido(pedido);
        log.debug("SolicitudDelivery asegurada para pedido {}", pedido.getId());
    }
}
