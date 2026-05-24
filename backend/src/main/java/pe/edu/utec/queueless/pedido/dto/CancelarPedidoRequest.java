package pe.edu.utec.queueless.pedido.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * Cuerpo opcional al cancelar un pedido como cliente. La razón no es obligatoria:
 * el cliente puede cancelar sin dar motivo.
 */
@Getter @Setter
public class CancelarPedidoRequest {
    private String razon;
}
