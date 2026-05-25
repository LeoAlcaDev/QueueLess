package pe.edu.utec.queueless.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pe.edu.utec.queueless.notification.dto.PushNotification;
import pe.edu.utec.queueless.notification.service.NotificationService;
import pe.edu.utec.queueless.usuario.entity.PerfilRepartidor;
import pe.edu.utec.queueless.usuario.repository.PerfilRepartidorRepository;

import java.util.List;
import java.util.Map;

/**
 * Busca repartidores disponibles cercanos y los notifica para que abran la app
 * y tomen la solicitud. El timeout configurable
 * ({@code queueless.delivery.busqueda-timeout-minutos}, default 4) lo monitorea
 * el job {@code BusquedaTimeoutJob}.
 *
 * <p>La "cercanía" real requeriría geolocalización; para el MVP notificamos a
 * todos los repartidores marcados como disponibles. La primera aceptación gana
 * y el resto recibe 422 al intentar aceptar la misma solicitud.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RepartidorMatchingService {

    private static final String TOPIC = "solicitud-delivery";

    private final PerfilRepartidorRepository perfilRepartidorRepository;
    private final NotificationService notificationService;

    @Value("${queueless.delivery.busqueda-timeout-minutos}")
    private int timeoutMinutos;

    @Async("queuelessTaskExecutor")
    public void iniciarBusqueda(Long solicitudId) {
        List<PerfilRepartidor> disponibles = perfilRepartidorRepository.findByDisponibleTrue();
        if (disponibles.isEmpty()) {
            log.warn("No hay repartidores disponibles para solicitud {} (timeout {} min)",
                solicitudId, timeoutMinutos);
            return;
        }
        log.info("Notificando solicitud {} a {} repartidor(es) disponible(s)",
            solicitudId, disponibles.size());
        for (PerfilRepartidor perfil : disponibles) {
            notificationService.notificar(PushNotification.builder()
                .topic(TOPIC + "-" + perfil.getUsuarioId())
                .titulo("Nueva entrega disponible")
                .cuerpo("Hay una entrega cerca tuyo, abrí la app para tomarla")
                .data(Map.of(
                    "solicitudId", solicitudId.toString(),
                    "timeoutMinutos", String.valueOf(timeoutMinutos)))
                .build());
        }
    }
}
