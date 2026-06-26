package pe.edu.utec.queueless.recomendador.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

/**
 * Un turno del historial de conversación. El cliente lo manda en cada request: el servidor
 * no persiste la conversación, viaja completa (acotada a los últimos turnos) cada vez.
 */
@Getter @Setter
public class TurnoConversacion {

    @NotNull(message = "El rol del turno es obligatorio")
    private RolConversacion rol;

    @NotBlank(message = "El texto del turno no puede estar vacío")
    private String texto;

    public enum RolConversacion { USUARIO, ASISTENTE }
}
