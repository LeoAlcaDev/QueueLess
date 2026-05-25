package pe.edu.utec.queueless.delivery.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;

import java.time.Instant;

/**
 * Vista de una solicitud de delivery para el repartidor o el cliente.
 *
 * <p>{@code repartidorId} viene null mientras la solicitud sigue en BUSCANDO; los
 * timestamps de asignación/recogida/entrega solo se completan cuando la
 * solicitud avanza a cada estado.
 */
@Getter
@Builder
@AllArgsConstructor
public class SolicitudDeliveryResponse {
    private final Long id;
    private final Long pedidoId;
    private final String pedidoCodigo;
    private final Long puntoDeVentaId;
    private final String puntoDeVentaNombre;
    private final String puntoDeVentaUbicacion;
    private final String zonaEntrega;
    private final EstadoSolicitudDelivery estado;
    private final Long repartidorId;
    private final Instant busquedaInicioAt;
    private final Instant busquedaFinAt;
    private final Instant asignadoAt;
    private final Instant recogidoAt;
    private final Instant entregadoAt;
}
