package pe.edu.utec.queueless.puntoventa.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

// Body del PATCH que abre o cierra un local (toggle diario de atencion).
@Getter @Setter
public class CambiarEstadoLocalRequest {

    @NotNull(message = "Hay que indicar si el local queda abierto o cerrado")
    private Boolean abierto;
}
