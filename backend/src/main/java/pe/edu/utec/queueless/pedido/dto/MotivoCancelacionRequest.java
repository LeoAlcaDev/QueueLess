package pe.edu.utec.queueless.pedido.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;

/**
 * Cuerpo cuando el comercio rechaza o cancela un pedido: un motivo de una lista
 * corta y, si quiere, un detalle libre. Cuando el motivo es OTRO, el detalle pasa
 * a ser obligatorio para que la cancelación quede explicada.
 */
@Getter @Setter
public class MotivoCancelacionRequest {

    @NotNull
    private MotivoCancelacion motivo;

    @Size(max = 200)
    private String detalle;

    @AssertTrue(message = "Cuando el motivo es OTRO, el detalle es obligatorio (entre 10 y 200 caracteres)")
    public boolean isDetalleValido() {
        if (motivo != MotivoCancelacion.OTRO) {
            return true;
        }
        return detalle != null && detalle.trim().length() >= 10;
    }
}
