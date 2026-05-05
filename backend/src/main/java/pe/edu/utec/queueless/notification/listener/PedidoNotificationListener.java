package pe.edu.utec.queueless.notification.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.notification.dto.PushNotification;
import pe.edu.utec.queueless.notification.service.NotificationService;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;

import java.util.Map;

/**
 * Manda push al cliente cuando su pedido cambia de estado.
 *
 * <p>TODO Semana 2: armar mensaje específico según el estado nuevo
 * ("Tu pedido fue aceptado", "Tu pedido está listo para recoger", etc.).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PedidoNotificationListener {

    private final NotificationService notificationService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onCambioEstado(PedidoEstadoCambiadoEvent event) {
        // TODO: cargar pedido, obtener clienteId, mapear estado a copy
        notificationService.notificar(PushNotification.builder()
            .topic("pedido-" + event.getPedidoId())
            .titulo("Tu pedido cambió de estado")
            .cuerpo("Estado actual: " + event.getEstadoNuevo())
            .data(Map.of("pedidoId", event.getPedidoId().toString()))
            .build());
    }
}
