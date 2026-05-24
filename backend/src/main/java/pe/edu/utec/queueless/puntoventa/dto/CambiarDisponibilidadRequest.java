package pe.edu.utec.queueless.puntoventa.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

// Body del PATCH que marca un producto como disponible o no disponible.
@Getter @Setter
public class CambiarDisponibilidadRequest {

    @NotNull(message = "Hay que indicar si el producto queda disponible")
    private Boolean disponible;
}
