package pe.edu.utec.queueless.usuario.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ActualizarPerfilRepartidorRequest {

    // Unico campo que el repartidor edita por si mismo. La calificacion sale de las
    // resenas y el total de entregas de los pedidos completados (no se setean aqui).
    @NotNull(message = "Debe indicar si esta disponible")
    private Boolean disponible;
}
