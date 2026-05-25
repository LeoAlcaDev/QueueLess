package pe.edu.utec.queueless.queuepoints.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.queuepoints.service.QueuePointsService;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.Optional;

/**
 * Cuando un pedido transiciona a ENTREGADO y tiene una SolicitudDelivery
 * asociada en estado ENTREGADO, registra los puntos GANADOS al repartidor.
 *
 * <p>La idempotencia la garantiza {@link QueuePointsService#registrarGanancia}:
 * usa {@code (tipo=GANADO, referenciaTipo=PEDIDO, referenciaId=pedidoId)} como
 * clave de deduplicación, así que si Spring reentrega el evento o el listener
 * se invoca dos veces, no se duplica el movimiento.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EntregaCompletadaListener {

    private static final String REFERENCIA_TIPO_PEDIDO = "PEDIDO";

    private final QueuePointsService queuePointsService;
    private final SolicitudDeliveryRepository solicitudDeliveryRepository;

    @Value("${queueless.queuepoints.puntos-por-entrega}")
    private int puntosPorEntrega;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onEntregaCompletada(PedidoEstadoCambiadoEvent event) {
        try {
            if (event.getEstadoNuevo() != EstadoPedido.ENTREGADO) {
                return;
            }
            Long pedidoId = event.getPedidoId();
            Optional<SolicitudDelivery> opt = solicitudDeliveryRepository.findByPedidoId(pedidoId);
            if (opt.isEmpty()) {
                log.debug("Pedido {} entregado sin SolicitudDelivery (pickup); no asigna QueuePoints",
                    pedidoId);
                return;
            }
            SolicitudDelivery solicitud = opt.get();
            if (solicitud.getEstado() != EstadoSolicitudDelivery.ENTREGADO
                    || solicitud.getRepartidor() == null) {
                log.warn("SolicitudDelivery {} en estado {} sin repartidor; no asigna QueuePoints",
                    solicitud.getId(), solicitud.getEstado());
                return;
            }
            Usuario repartidor = solicitud.getRepartidor();
            Pedido pedido = solicitud.getPedido();
            String descripcion = "Entrega del pedido " + pedido.getCodigo();
            queuePointsService.registrarGanancia(
                repartidor, puntosPorEntrega, REFERENCIA_TIPO_PEDIDO, pedidoId, descripcion);
        } catch (Exception e) {
            log.error("Error asignando QueuePoints al repartidor del pedido {}: {}",
                event.getPedidoId(), e.getMessage(), e);
        }
    }
}
