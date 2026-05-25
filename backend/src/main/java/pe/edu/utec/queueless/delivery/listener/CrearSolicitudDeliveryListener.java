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
 * Cuando un pedido tipo DELIVERY queda pagado y en búsqueda de repartidor,
 * crea automáticamente la SolicitudDelivery para que la búsqueda arranque.
 *
 * <p>Reacciona al cambio de estado una vez que su transacción confirma y corre
 * en otro hilo. El service es idempotente, así que si el evento se procesara
 * dos veces no se crearían dos solicitudes. El guard por tipo de entrega
 * protege ante cambios futuros de la máquina de estados.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CrearSolicitudDeliveryListener {

    private final SolicitudDeliveryService solicitudDeliveryService;
    private final PedidoService pedidoService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onPedidoBuscandoRepartidor(PedidoEstadoCambiadoEvent event) {
        try {
            if (event.getEstadoNuevo() != EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR) {
                return;
            }
            Pedido pedido = pedidoService.findById(event.getPedidoId());
            if (pedido.getTipoEntrega() != TipoEntrega.DELIVERY) {
                return;
            }
            solicitudDeliveryService.crearParaPedido(pedido);
            log.debug("SolicitudDelivery asegurada para pedido {}", pedido.getId());
        } catch (Exception e) {
            log.error("Error creando SolicitudDelivery para pedido {}: {}",
                event.getPedidoId(), e.getMessage(), e);
        }
    }
}
