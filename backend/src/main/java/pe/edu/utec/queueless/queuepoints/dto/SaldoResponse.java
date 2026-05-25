package pe.edu.utec.queueless.queuepoints.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class SaldoResponse {
    private final Long usuarioId;
    private final Integer saldo;
}
