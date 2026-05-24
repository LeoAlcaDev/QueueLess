package pe.edu.utec.queueless.pedido.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Una línea del pedido. El nombre se trae del producto al armar la respuesta;
 * el precio unitario se conserva del momento en que se hizo el pedido.
 */
@Getter
@Builder
@AllArgsConstructor
public class ItemPedidoResponse {
    private final Long id;
    private final Long productoId;
    private final String nombre;
    private final Integer cantidad;
    private final BigDecimal precioUnitario;
    private final BigDecimal subtotal;
}
