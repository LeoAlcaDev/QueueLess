package pe.edu.utec.queueless.queuepoints.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.queuepoints.service.QueuePointsService;

/**
 * Cuando un pedido transiciona a ENTREGADO con tipo DELIVERY, se asignan
 * puntos al repartidor. Ejecuta async para no bloquear la respuesta HTTP.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EntregaCompletadaListener {

    private final QueuePointsService queuePointsService;

    @Value("${queueless.queuepoints.puntos-por-entrega}")
    private int puntosPorEntrega;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onEntregaCompletada(PedidoEstadoCambiadoEvent event) {
        if (event.getEstadoNuevo() != EstadoPedido.ENTREGADO) {
            return;
        }
        // TODO Semana 3: si el pedido tenía SolicitudDelivery, sumar `puntosPorEntrega`
        // al repartidor mediante queuePointsService.registrarGanancia(...)
        log.debug("Pedido {} entregado, evaluar asignación de QueuePoints", event.getPedidoId());
    }
}
