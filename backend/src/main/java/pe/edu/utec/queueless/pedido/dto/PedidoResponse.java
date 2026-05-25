package pe.edu.utec.queueless.pedido.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Vista completa de un pedido. Se arma a mano en el service (ver
 * {@code PedidoService.toResponse}) porque incluye la lista de items y el nombre
 * de cada producto, que no es un mapeo 1:1 con la entidad.
 *
 * <p>Los timestamps de transición vienen null mientras el pedido no llegue a ese
 * estado; {@code motivoCancelacion} y {@code detalleCancelacion} solo traen valor
 * si el pedido fue cancelado.
 */
@Getter
@Builder
@AllArgsConstructor
public class PedidoResponse {
    private final Long id;
    private final String codigo;
    private final EstadoPedido estado;
    private final TipoEntrega tipoEntrega;
    private final Long puntoDeVentaId;
    private final BigDecimal subtotal;
    private final BigDecimal descuentoQpts;
    private final BigDecimal total;
    private final List<ItemPedidoResponse> items;
    private final Instant creadoAt;
    private final Instant pagadoAt;
    private final Instant aceptadoAt;
    private final Instant listoAt;
    private final Instant entregadoAt;
    private final Instant canceladoAt;
    private final MotivoCancelacion motivoCancelacion;
    private final String detalleCancelacion;
}
