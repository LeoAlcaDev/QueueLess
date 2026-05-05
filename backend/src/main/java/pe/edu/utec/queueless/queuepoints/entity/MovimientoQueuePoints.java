package pe.edu.utec.queueless.queuepoints.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;

@Entity
@Table(name = "movimiento_queuepoints")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MovimientoQueuePoints {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMovimiento tipo;

    @Column(nullable = false)
    private Integer monto;

    @Column(name = "referencia_tipo", length = 30)
    private String referenciaTipo;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(length = 200)
    private String descripcion;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
