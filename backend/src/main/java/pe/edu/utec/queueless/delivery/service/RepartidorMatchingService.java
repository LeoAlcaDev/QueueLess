package pe.edu.utec.queueless.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.delivery.event.SolicitudDeliveryCreadaEvent;
import pe.edu.utec.queueless.notification.dto.PushNotification;
import pe.edu.utec.queueless.notification.service.NotificationService;
import pe.edu.utec.queueless.usuario.entity.PerfilRepartidor;
import pe.edu.utec.queueless.usuario.repository.PerfilRepartidorRepository;

import java.util.List;
import java.util.Map;

/**
 * Escucha la creación de una SolicitudDelivery (una vez que su transacción
 * confirma) y avisa a los repartidores disponibles para que abran la app y
 * tomen la entrega. El timeout configurable
 * ({@code queueless.delivery.busqueda-timeout-minutos}, default 4) lo monitorea
 * el job {@code BusquedaTimeoutJob}.
 *
 * <p>La "cercanía" real requeriría geolocalización; para el MVP notificamos a
 * todos los repartidores marcados como disponibles. La primera aceptación gana
 * y el resto recibe un rechazo al intentar tomar la misma solicitud.
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
    @TransactionalEventListener
    public void onSolicitudCreada(SolicitudDeliveryCreadaEvent event) {
        List<PerfilRepartidor> disponibles = perfilRepartidorRepository.findByDisponibleTrue();
        if (disponibles.isEmpty()) {
            log.warn("No hay repartidores disponibles para solicitud {} (timeout {} min)",
                event.getSolicitudId(), timeoutMinutos);
            return;
        }
        log.info("Notificando solicitud {} a {} repartidor(es) disponible(s)",
            event.getSolicitudId(), disponibles.size());
        for (PerfilRepartidor perfil : disponibles) {
            notificationService.notificar(PushNotification.builder()
                .topic(TOPIC + "-" + perfil.getUsuarioId())
                .titulo("Nueva entrega disponible")
                .cuerpo("Hay una entrega disponible, abrí la app para tomarla")
                .data(Map.of(
                    "solicitudId", event.getSolicitudId().toString(),
                    "timeoutMinutos", String.valueOf(timeoutMinutos)))
                .build());
        }
    }
}
