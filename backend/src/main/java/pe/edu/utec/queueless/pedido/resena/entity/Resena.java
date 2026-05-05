package pe.edu.utec.queueless.pedido.resena.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;

@Entity
@Table(name = "resena")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Resena {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autor_id", nullable = false)
    private Usuario autor;

    @Enumerated(EnumType.STRING)
    @Column(name = "objetivo_tipo", nullable = false, length = 20)
    private ObjetivoResena objetivoTipo;

    @Column(name = "objetivo_id", nullable = false)
    private Long objetivoId;

    @Column(nullable = false)
    private Short calificacion;

    @Column(columnDefinition = "TEXT")
    private String comentario;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
