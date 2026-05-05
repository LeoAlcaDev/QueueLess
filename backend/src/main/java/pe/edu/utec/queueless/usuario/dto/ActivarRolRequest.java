package pe.edu.utec.queueless.usuario.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.usuario.entity.Rol;

@Getter @Setter
public class ActivarRolRequest {

    @NotNull(message = "El rol es obligatorio")
    private Rol rol;
}
