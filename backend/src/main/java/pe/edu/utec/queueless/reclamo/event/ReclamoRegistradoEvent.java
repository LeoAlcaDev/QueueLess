package pe.edu.utec.queueless.reclamo.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Se publica al registrar un reclamo. Lo consume el listener que manda el acuse al
 * usuario y enruta la notificación al comercio o al correo de operadores. Solo lleva
 * el id; el listener carga la entidad. Ver ADR-0029 y ADR-0009.
 */
@Getter
@AllArgsConstructor
public class ReclamoRegistradoEvent {
    private final Long reclamoId;
}
