package pe.edu.utec.queueless.reclamo.dto;

import lombok.Getter;
import pe.edu.utec.queueless.reclamo.entity.DestinatarioReclamo;
import pe.edu.utec.queueless.reclamo.entity.EstadoReclamo;
import pe.edu.utec.queueless.reclamo.entity.Reclamo;
import pe.edu.utec.queueless.reclamo.entity.TipoReclamo;

import java.time.Instant;

/**
 * El acuse de recibo que devuelve el registro de un reclamo: el código de constancia,
 * el plazo de respuesta y un mensaje. Ver ADR-0029.
 */
@Getter
public class AcuseReclamoResponse {

    private final String codigoConstancia;
    private final TipoReclamo tipo;
    private final DestinatarioReclamo contra;
    private final EstadoReclamo estado;
    private final Instant plazoRespuestaAt;
    private final String mensaje;

    private AcuseReclamoResponse(String codigoConstancia, TipoReclamo tipo, DestinatarioReclamo contra,
                                EstadoReclamo estado, Instant plazoRespuestaAt, String mensaje) {
        this.codigoConstancia = codigoConstancia;
        this.tipo = tipo;
        this.contra = contra;
        this.estado = estado;
        this.plazoRespuestaAt = plazoRespuestaAt;
        this.mensaje = mensaje;
    }

    public static AcuseReclamoResponse de(Reclamo reclamo, String mensaje) {
        return new AcuseReclamoResponse(
            reclamo.getCodigoConstancia(),
            reclamo.getTipo(),
            reclamo.getContra(),
            reclamo.getEstado(),
            reclamo.getPlazoRespuestaAt(),
            mensaje);
    }
}
