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

    /**
     * Referencia externa de la pasarela de pagos. Su significado evoluciona a lo largo
     * del ciclo de vida del pago:
     * <ul>
     *   <li><b>Tras {@code iniciarCobro}</b>: contiene el preference_id de MercadoPago
     *       (o la referencia mock en dev). Identifica el "intent de cobro".</li>
     *   <li><b>Tras la confirmación por webhook</b>: se reemplaza por el payment_id real
     *       (vía {@code PagoService.confirmarPorId}). A partir de aquí es el id que
     *       MercadoPago espera para emitir reembolsos.</li>
     * </ul>
     * Por esto, {@code reembolsar} solo debe llamarse sobre pagos en estado CONFIRMADO,
     * garantizando que la referencia ya corresponde al payment_id.
     */
    @Column(name = "referencia_externa", length = 150)
    private String referenciaExterna;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "confirmado_at")
    private Instant confirmadoAt;

    @Column(name = "reembolsado_at")
    private Instant reembolsadoAt;
}
