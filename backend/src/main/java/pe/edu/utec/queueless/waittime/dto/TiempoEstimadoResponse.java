package pe.edu.utec.queueless.waittime.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Respuesta del endpoint público de tiempo estimado. Se serializa como
 * {@code {"minutos": N}}, la forma que fija el ADR del modelo de tiempos de espera.
 */
@Getter
@AllArgsConstructor
public class TiempoEstimadoResponse {
    private final int minutos;
}
