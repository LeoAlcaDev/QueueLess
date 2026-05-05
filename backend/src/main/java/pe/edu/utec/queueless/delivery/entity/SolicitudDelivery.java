package pe.edu.utec.queueless.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;

@Entity
@Table(name = "solicitud_delivery")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SolicitudDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false, unique = true)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repartidor_id")
    private Usuario repartidor;

    @Column(name = "zona_entrega", nullable = false, length = 100)
    private String zonaEntrega;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoSolicitudDelivery estado;

    @Column(name = "busqueda_inicio_at", nullable = false)
    private Instant busquedaInicioAt;

    @Column(name = "busqueda_fin_at", nullable = false)
    private Instant busquedaFinAt;

    @Column(name = "asignado_at")
    private Instant asignadoAt;

    @Column(name = "recogido_at")
    private Instant recogidoAt;

    @Column(name = "entregado_at")
    private Instant entregadoAt;
}
