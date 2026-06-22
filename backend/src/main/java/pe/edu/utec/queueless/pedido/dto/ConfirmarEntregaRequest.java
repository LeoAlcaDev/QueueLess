package pe.edu.utec.queueless.pedido.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Cuerpo con el código de entrega que el cliente porta y la contraparte valida al
 * cerrar el pedido. Lo comparten el recojo en tienda y el delivery: el comercio o
 * el repartidor mandan acá el código que el cliente les muestra —tecleado o
 * escaneado de su QR— y el cierre solo procede si coincide (ADR-0027).
 */
@Getter
@Setter
public class ConfirmarEntregaRequest {

    @NotBlank
    private String codigo;
}
