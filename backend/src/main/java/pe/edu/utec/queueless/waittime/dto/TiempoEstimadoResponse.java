package pe.edu.utec.queueless.waittime.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Respuesta del endpoint público de tiempo estimado. Viaja dentro del envoltorio
 * {@code ApiResponse} común a la API, así que el cliente lo lee en {@code data.minutos}.
 */
@Getter
@AllArgsConstructor
public class TiempoEstimadoResponse {
    private final int minutos;
}
