package pe.edu.utec.queueless.puntoventa.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalTime;

@Getter
@Builder
@AllArgsConstructor
public class PuntoDeVentaResponse {
    private final Long id;
    private final String nombre;
    private final String ubicacion;
    private final LocalTime horarioApertura;
    private final LocalTime horarioCierre;
    private final Integer tiempoEsperaEstimado;
    private final Boolean abierto;
}
