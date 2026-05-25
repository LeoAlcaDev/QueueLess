package pe.edu.utec.queueless.pago.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.pago.entity.EstadoPago;
import pe.edu.utec.queueless.pago.entity.Pago;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Builder
@AllArgsConstructor
public class PagoResponse {
    private final Long id;
    private final Long pedidoId;
    private final BigDecimal monto;
    private final String metodo;
    private final EstadoPago estado;
    private final String referenciaExterna;
    private final Instant createdAt;
    private final Instant confirmadoAt;
    private final Instant reembolsadoAt;

    public static PagoResponse from(Pago pago) {
        return PagoResponse.builder()
            .id(pago.getId())
            .pedidoId(pago.getPedido().getId())
            .monto(pago.getMonto())
            .metodo(pago.getMetodo())
            .estado(pago.getEstado())
            .referenciaExterna(pago.getReferenciaExterna())
            .createdAt(pago.getCreatedAt())
            .confirmadoAt(pago.getConfirmadoAt())
            .reembolsadoAt(pago.getReembolsadoAt())
            .build();
    }
}
