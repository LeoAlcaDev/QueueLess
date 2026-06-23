package pe.edu.utec.queueless.reclamo.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Se publica cuando un reclamo se marca como respondido. Lo consume el listener que le
 * manda la respuesta al usuario por correo. Solo lleva el id. Ver ADR-0029 y ADR-0009.
 */
@Getter
@AllArgsConstructor
public class ReclamoRespondidoEvent {
    private final Long reclamoId;
}
