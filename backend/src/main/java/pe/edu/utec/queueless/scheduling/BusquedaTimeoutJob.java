package pe.edu.utec.queueless.scheduling;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;

import java.time.Instant;
import java.util.List;

/**
 * Cuando una SolicitudDelivery cumple el deadline (4 minutos por defecto)
 * y aún está en BUSCANDO, la mueve a SIN_REPARTIDOR.
 *
 * <p>TODO Semana 3: además gatillar transición del Pedido para que el cliente
 * reciba la opción de reintentar / cambiar a pickup / cancelar.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BusquedaTimeoutJob {

    private final SolicitudDeliveryRepository repository;

    /** Corre cada 30 segundos. */
    @Scheduled(fixedDelayString = "PT30S")
    public void procesarTimeouts() {
        List<SolicitudDelivery> vencidas = repository.findByEstadoAndBusquedaFinAtBefore(
            EstadoSolicitudDelivery.BUSCANDO, Instant.now());
        for (SolicitudDelivery s : vencidas) {
            log.info("Timeout de búsqueda para solicitud {}", s.getId());
            s.setEstado(EstadoSolicitudDelivery.SIN_REPARTIDOR);
            repository.save(s);
            // TODO: notificar al cliente y dejar el Pedido en estado intermedio
        }
    }
}
