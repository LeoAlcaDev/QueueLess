package pe.edu.utec.queueless.reclamo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.reclamo.entity.DestinatarioReclamo;
import pe.edu.utec.queueless.reclamo.entity.TipoReclamo;

/**
 * Cuerpo para registrar un reclamo. Cuando {@code contra} es COMERCIO, el
 * {@code puntoDeVentaId} es obligatorio; lo valida el servicio. El {@code pedidoId}
 * es opcional en cualquier caso.
 */
@Getter
@Setter
public class CrearReclamoRequest {

    @NotNull
    private TipoReclamo tipo;

    @NotNull
    private DestinatarioReclamo contra;

    private Long puntoDeVentaId;

    private Long pedidoId;

    @NotBlank
    private String detalle;
}
