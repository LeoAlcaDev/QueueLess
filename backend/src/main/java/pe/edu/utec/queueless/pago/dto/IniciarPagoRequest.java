package pe.edu.utec.queueless.pago.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class IniciarPagoRequest {

    @NotNull
    private Long pedidoId;
}
