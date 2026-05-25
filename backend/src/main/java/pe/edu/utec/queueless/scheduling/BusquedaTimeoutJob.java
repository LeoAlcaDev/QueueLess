package pe.edu.utec.queueless.scheduling;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.notification.dto.PushNotification;
import pe.edu.utec.queueless.notification.service.NotificationService;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Cuando una SolicitudDelivery cumple su deadline (4 minutos por defecto) y
 * sigue en BUSCANDO, la pasa a SIN_REPARTIDOR y avisa al cliente.
 *
 * <p>No transiciona el pedido a propósito: queda en PAGADO_BUSCANDO_REPARTIDOR
 * para que el cliente decida entre reintentar la búsqueda, cambiar a recojo en
 * tienda o cancelar (con reembolso).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BusquedaTimeoutJob {

    private final SolicitudDeliveryRepository repository;
    private final NotificationService notificationService;

    /** Corre cada 30 segundos. */
    @Scheduled(fixedDelayString = "PT30S")
    @Transactional
    public void procesarTimeouts() {
        List<SolicitudDelivery> vencidas = repository.findByEstadoAndBusquedaFinAtBefore(
            EstadoSolicitudDelivery.BUSCANDO, Instant.now());
        for (SolicitudDelivery solicitud : vencidas) {
            log.info("Timeout de búsqueda para solicitud {}", solicitud.getId());
            solicitud.setEstado(EstadoSolicitudDelivery.SIN_REPARTIDOR);
            repository.save(solicitud);
            notificarCliente(solicitud);
        }
    }

    private void notificarCliente(SolicitudDelivery solicitud) {
        Long clienteId = solicitud.getPedido().getCliente().getId();
        notificationService.notificar(PushNotification.builder()
            .topic("cliente-" + clienteId)
            .titulo("No encontramos repartidor")
            .cuerpo("Podés reintentar la búsqueda, cambiar a recojo en tienda, o cancelar.")
            .data(Map.of(
                "pedidoId", solicitud.getPedido().getId().toString(),
                "solicitudId", solicitud.getId().toString(),
                "requiereDecision", "true"))
            .build());
    }
}
