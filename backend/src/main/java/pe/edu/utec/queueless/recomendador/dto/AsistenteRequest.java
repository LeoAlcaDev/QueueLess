package pe.edu.utec.queueless.recomendador.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Lo que el cliente le manda al asistente: su mensaje, el historial reciente de la
 * conversación y, opcional, el local al que quiere acotar la recomendación. Sin
 * puntoDeVentaId, el asistente considera todos los locales abiertos en ese momento.
 */
@Getter @Setter
public class AsistenteRequest {

    @NotBlank(message = "El mensaje no puede estar vacío")
    private String mensaje;

    @Valid
    private List<TurnoConversacion> historial;

    private Long puntoDeVentaId;
}
