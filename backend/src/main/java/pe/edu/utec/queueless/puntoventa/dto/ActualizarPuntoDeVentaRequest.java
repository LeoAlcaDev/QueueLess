package pe.edu.utec.queueless.puntoventa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Getter @Setter
public class ActualizarPuntoDeVentaRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
    private String nombre;

    @NotBlank(message = "La ubicacion es obligatoria")
    @Size(max = 200, message = "La ubicacion no puede superar 200 caracteres")
    private String ubicacion;

    private LocalTime horarioApertura;

    private LocalTime horarioCierre;

    @Positive(message = "El tiempo promedio debe ser un numero positivo")
    private Integer tiempoPromedioDeclarado;
}
