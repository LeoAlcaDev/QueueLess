package pe.edu.utec.queueless.reclamo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Cuerpo con la respuesta que el comercio le da a un reclamo en su contra.
 */
@Getter
@Setter
public class ResponderReclamoRequest {

    @NotBlank
    private String respuesta;
}
