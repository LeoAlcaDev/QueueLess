package pe.edu.utec.queueless.sse.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;

import java.time.Instant;

/**
 * Lo que viaja por el stream SSE cuando un pedido cambia de estado. Es
 * deliberadamente mínimo: solo el cambio en sí y a qué pedido y local pertenece.
 *
 * <p>No incluye el código del pedido a propósito: ese código se reserva como una
 * prueba que solo el cliente porta y muestra, así que mandarlo en vivo al
 * comercio lo dejaría sin esa garantía. Si la app necesita más datos del pedido,
 * los pide refrescando su detalle, que es donde viven. Ver ADR-0024.
 */
@Getter
@Builder
@AllArgsConstructor
public class CambioEstadoSse {
    private final Long pedidoId;
    private final EstadoPedido estadoAnterior;
    private final EstadoPedido estadoNuevo;
    private final Long puntoDeVentaId;
    private final Instant ocurridoAt;
}
