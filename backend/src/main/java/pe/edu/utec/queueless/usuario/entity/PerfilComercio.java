package pe.edu.utec.queueless.usuario.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "perfil_comercio")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PerfilComercio {

    @Id
    @Column(name = "usuario_id")
    private Long usuarioId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(length = 11)
    private String ruc;

    @Column(name = "contacto_telefono", length = 20)
    private String contactoTelefono;

    @Column(name = "contacto_email", length = 150)
    private String contactoEmail;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;
}
