package pe.edu.utec.queueless.delivery.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Evento publicado al persistir una SolicitudDelivery nueva. El matching lo
 * escucha después del commit para no notificar repartidores sobre solicitudes
 * cuya transacción todavía podría revertirse.
 */
@Getter
@AllArgsConstructor
public class SolicitudDeliveryCreadaEvent {
    private final Long solicitudId;
}
