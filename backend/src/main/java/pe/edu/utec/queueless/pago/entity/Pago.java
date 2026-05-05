package pe.edu.utec.queueless.pago.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.pedido.entity.Pedido;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "pago")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false, unique = true)
    private Pedido pedido;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false, length = 30)
    private String metodo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EstadoPago estado;

    @Column(name = "referencia_externa", length = 150)
    private String referenciaExterna;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "confirmado_at")
    private Instant confirmadoAt;

    @Column(name = "reembolsado_at")
    private Instant reembolsadoAt;
}
