package pe.edu.utec.queueless.notification.listener;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.notification.MensajePush;
import pe.edu.utec.queueless.notification.MensajesPedidoCatalogo;
import pe.edu.utec.queueless.notification.dto.PushNotification;
import pe.edu.utec.queueless.notification.service.NotificationService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.service.PedidoService;

import java.util.Map;

/**
 * Manda una push al cliente cuando su pedido cambia de estado, con el mensaje que
 * corresponde al estado nuevo. No notifica cuando el pedido entra en PENDIENTE_PAGO
 * (el cliente está pagando) ni cuando el propio cliente cancela desde PENDIENTE_PAGO
 * (ya lo sabe, acaba de hacerlo).
 */
@Component
@RequiredArgsConstructor
public class PedidoNotificationListener {

    private final NotificationService notificationService;
    private final PedidoService pedidoService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onCambioEstado(PedidoEstadoCambiadoEvent event) {
        if (noNotifica(event)) {
            return;
        }
        MensajePush mensaje = MensajesPedidoCatalogo.para(event.getEstadoNuevo());
        if (mensaje == null) {
            return;
        }
        Pedido pedido = pedidoService.findById(event.getPedidoId());
        Long clienteId = pedido.getCliente().getId();
        notificationService.notificar(PushNotification.builder()
            .topic("cliente-" + clienteId)
            .titulo(mensaje.titulo())
            .cuerpo(mensaje.cuerpo())
            .data(Map.of("pedidoId", event.getPedidoId().toString()))
            .build());
    }

    private boolean noNotifica(PedidoEstadoCambiadoEvent event) {
        if (event.getEstadoNuevo() == EstadoPedido.PENDIENTE_PAGO) {
            return true;
        }
        return event.getEstadoNuevo() == EstadoPedido.CANCELADO_POR_CLIENTE
            && event.getEstadoAnterior() == EstadoPedido.PENDIENTE_PAGO;
    }
}
