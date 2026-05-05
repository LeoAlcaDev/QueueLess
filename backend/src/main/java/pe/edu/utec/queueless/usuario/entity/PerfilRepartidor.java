package pe.edu.utec.queueless.usuario.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "perfil_repartidor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PerfilRepartidor {

    @Id
    @Column(name = "usuario_id")
    private Long usuarioId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "medio_transporte", length = 30)
    private String medioTransporte;

    @Column(name = "calificacion_promedio", precision = 3, scale = 2)
    private BigDecimal calificacionPromedio;

    @Column(name = "total_entregas", nullable = false)
    @Builder.Default
    private Integer totalEntregas = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean disponible = false;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;
}
