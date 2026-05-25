package pe.edu.utec.queueless.queuepoints.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CanjearPuntosRequest {

    @NotNull
    @Min(1)
    private Integer monto;

    /** Origen del canje (por ejemplo {@code PEDIDO}, {@code BONO}). Obligatorio para no duplicar. */
    @NotBlank
    private String referenciaTipo;

    /** Id del recurso del cual se canjean los puntos (por ejemplo el pedidoId). Obligatorio. */
    @NotNull
    private Long referenciaId;

    /** Descripción opcional para el historial. */
    private String descripcion;
}
