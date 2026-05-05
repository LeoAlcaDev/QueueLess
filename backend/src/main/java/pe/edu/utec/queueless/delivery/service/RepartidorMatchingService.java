package pe.edu.utec.queueless.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Lógica de búsqueda de repartidores con timeout configurable
 * (queueless.delivery.busqueda-timeout-minutos, default 4).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RepartidorMatchingService {

    @Value("${queueless.delivery.busqueda-timeout-minutos}")
    private int timeoutMinutos;

    @Async("queuelessTaskExecutor")
    public void iniciarBusqueda(Long solicitudId) {
        // TODO Semana 3: notificar a repartidores disponibles cercanos.
        // El timeout se monitorea con el job BusquedaTimeoutJob.
        log.info("Iniciando búsqueda para solicitud {} (timeout {} min)", solicitudId, timeoutMinutos);
    }
}
