package pe.edu.utec.queueless.pedido.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;

@Getter @Setter
public class CambiarEstadoRequest {

    @NotNull
    private EstadoPedido nuevoEstado;

    /** Requerido si el comercio cancela. */
    private String razon;
}
