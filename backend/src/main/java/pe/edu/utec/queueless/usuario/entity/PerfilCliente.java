package pe.edu.utec.queueless.usuario.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "perfil_cliente")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PerfilCliente {

    @Id
    @Column(name = "usuario_id")
    private Long usuarioId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "direccion_preferida", length = 200)
    private String direccionPreferida;

    @Column(columnDefinition = "TEXT")
    private String alergias;

    @Column(name = "total_pedidos", nullable = false)
    @Builder.Default
    private Integer totalPedidos = 0;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;
}
