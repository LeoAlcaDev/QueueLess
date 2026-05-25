package pe.edu.utec.queueless.pago.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.pago.entity.EstadoPago;

import java.math.BigDecimal;

@Getter
@Builder
@AllArgsConstructor
public class IniciarPagoResponse {
    private final Long pagoId;
    private final Long pedidoId;
    private final BigDecimal monto;
    private final EstadoPago estado;
    private final String referenciaExterna;
    private final String urlCheckout;
}
