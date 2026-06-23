package pe.edu.utec.queueless.reclamo.dto;

import lombok.Getter;
import pe.edu.utec.queueless.reclamo.entity.DestinatarioReclamo;
import pe.edu.utec.queueless.reclamo.entity.EstadoReclamo;
import pe.edu.utec.queueless.reclamo.entity.Reclamo;
import pe.edu.utec.queueless.reclamo.entity.TipoReclamo;

import java.time.Instant;

/**
 * Vista de un reclamo para los listados (los propios del usuario y los del comercio) y
 * para la respuesta del endpoint de responder. Ver ADR-0029.
 */
@Getter
public class ReclamoResponse {

    private final Long id;
    private final String codigoConstancia;
    private final TipoReclamo tipo;
    private final DestinatarioReclamo contra;
    private final Long puntoDeVentaId;
    private final Long pedidoId;
    private final String detalle;
    private final EstadoReclamo estado;
    private final String respuesta;
    private final Instant respondidoAt;
    private final Instant plazoRespuestaAt;
    private final Instant creadoAt;

    private ReclamoResponse(Long id, String codigoConstancia, TipoReclamo tipo, DestinatarioReclamo contra,
                           Long puntoDeVentaId, Long pedidoId, String detalle, EstadoReclamo estado,
                           String respuesta, Instant respondidoAt, Instant plazoRespuestaAt, Instant creadoAt) {
        this.id = id;
        this.codigoConstancia = codigoConstancia;
        this.tipo = tipo;
        this.contra = contra;
        this.puntoDeVentaId = puntoDeVentaId;
        this.pedidoId = pedidoId;
        this.detalle = detalle;
        this.estado = estado;
        this.respuesta = respuesta;
        this.respondidoAt = respondidoAt;
        this.plazoRespuestaAt = plazoRespuestaAt;
        this.creadoAt = creadoAt;
    }

    public static ReclamoResponse de(Reclamo reclamo) {
        Long puntoDeVentaId = reclamo.getPuntoDeVenta() == null ? null : reclamo.getPuntoDeVenta().getId();
        Long pedidoId = reclamo.getPedido() == null ? null : reclamo.getPedido().getId();
        return new ReclamoResponse(
            reclamo.getId(),
            reclamo.getCodigoConstancia(),
            reclamo.getTipo(),
            reclamo.getContra(),
            puntoDeVentaId,
            pedidoId,
            reclamo.getDetalle(),
            reclamo.getEstado(),
            reclamo.getRespuesta(),
            reclamo.getRespondidoAt(),
            reclamo.getPlazoRespuestaAt(),
            reclamo.getCreatedAt());
    }
}
