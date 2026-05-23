package pe.edu.utec.queueless.usuario.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ActualizarPerfilClienteRequest {

    @Size(max = 200, message = "La direccion no puede superar 200 caracteres")
    private String direccionPreferida;

    @Size(max = 500, message = "Las alergias no pueden superar 500 caracteres")
    private String alergias;
}
