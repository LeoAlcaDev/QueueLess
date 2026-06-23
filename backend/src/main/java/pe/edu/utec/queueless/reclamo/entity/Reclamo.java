package pe.edu.utec.queueless.reclamo.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.shared.domain.BaseEntity;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;

/**
 * Una entrada del libro de reclamaciones: quién reclama, si es reclamo o queja, contra
 * quién va, el detalle y, opcionalmente, el pedido relacionado. Al registrarse recibe un
 * código de constancia y una fecha límite de respuesta. Ver ADR-0029.
 */
@Entity
@Table(name = "reclamo")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reclamo extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoReclamo tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DestinatarioReclamo contra;

    // Obligatorio cuando el reclamo va contra un comercio; nulo cuando va contra la plataforma.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "punto_de_venta_id")
    private PuntoDeVenta puntoDeVenta;

    // Pedido relacionado, opcional en cualquier caso.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id")
    private Pedido pedido;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String detalle;

    @Column(name = "codigo_constancia", nullable = false, unique = true, length = 20)
    private String codigoConstancia;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoReclamo estado = EstadoReclamo.PENDIENTE;

    @Column(columnDefinition = "TEXT")
    private String respuesta;

    @Column(name = "respondido_at")
    private Instant respondidoAt;

    @Column(name = "plazo_respuesta_at", nullable = false)
    private Instant plazoRespuestaAt;
}
