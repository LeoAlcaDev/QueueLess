package pe.edu.utec.queueless.pedido.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Builder
@AllArgsConstructor
public class PedidoResponse {
    private final Long id;
    private final String codigo;
    private final EstadoPedido estado;
    private final TipoEntrega tipoEntrega;
    private final BigDecimal subtotal;
    private final BigDecimal descuentoQpts;
    private final BigDecimal total;
    private final Instant creadoAt;
}
