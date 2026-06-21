package pe.edu.utec.queueless.usuario.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.shared.domain.Alergeno;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

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

    // Alergias en texto libre: guarda el matiz que la lista cerrada no captura
    // ("solo el maní tostado"). Convive con alergenosEvitar, no lo reemplaza.
    @Column(columnDefinition = "TEXT")
    private String alergias;

    // Alérgenos que el cliente evita, de la lista cerrada compartida con el
    // producto (ADR-0025). Es un conjunto: puede evitar varios a la vez.
    @ElementCollection
    @CollectionTable(name = "perfil_cliente_alergeno",
        joinColumns = @JoinColumn(name = "perfil_cliente_id"))
    @Column(name = "alergeno", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<Alergeno> alergenosEvitar = new HashSet<>();

    // Restricciones de dieta; conviven varias (vegano y sin gluten, por ejemplo).
    @ElementCollection
    @CollectionTable(name = "perfil_cliente_restriccion",
        joinColumns = @JoinColumn(name = "perfil_cliente_id"))
    @Column(name = "restriccion", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<RestriccionDietetica> restriccionesDieteticas = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "tolerancia_picante", length = 20)
    private ToleranciaPicante toleranciaPicante;

    // Presupuesto de referencia para filtrar el catálogo (opcional).
    @Column(name = "presupuesto_referencia", precision = 8, scale = 2)
    private BigDecimal presupuestoReferencia;

    @Column(name = "total_pedidos", nullable = false)
    @Builder.Default
    private Integer totalPedidos = 0;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;
}
