package pe.edu.utec.queueless.queuepoints.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;

import java.time.Instant;

@Getter
@Builder
@AllArgsConstructor
public class MovimientoResponse {
    private final Long id;
    private final TipoMovimiento tipo;
    private final Integer monto;
    private final String referenciaTipo;
    private final Long referenciaId;
    private final String descripcion;
    private final Instant createdAt;

    public static MovimientoResponse from(MovimientoQueuePoints mov) {
        return MovimientoResponse.builder()
            .id(mov.getId())
            .tipo(mov.getTipo())
            .monto(mov.getMonto())
            .referenciaTipo(mov.getReferenciaTipo())
            .referenciaId(mov.getReferenciaId())
            .descripcion(mov.getDescripcion())
            .createdAt(mov.getCreatedAt())
            .build();
    }
}
