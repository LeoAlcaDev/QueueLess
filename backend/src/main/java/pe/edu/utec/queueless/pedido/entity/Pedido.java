package pe.edu.utec.queueless.pedido.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pedido")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String codigo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Usuario cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "punto_de_venta_id", nullable = false)
    private PuntoDeVenta puntoDeVenta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EstadoPedido estado;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_entrega", nullable = false, length = 20)
    private TipoEntrega tipoEntrega;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "descuento_qpts", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal descuentoQpts = BigDecimal.ZERO;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal total;

    @Column(name = "creado_at", insertable = false, updatable = false)
    private Instant creadoAt;

    @Column(name = "pagado_at")
    private Instant pagadoAt;

    @Column(name = "aceptado_at")
    private Instant aceptadoAt;

    @Column(name = "listo_at")
    private Instant listoAt;

    @Column(name = "entregado_at")
    private Instant entregadoAt;

    @Column(name = "cancelado_at")
    private Instant canceladoAt;

    @Column(name = "razon_cancelacion", columnDefinition = "TEXT")
    private String razonCancelacion;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ItemPedido> items = new ArrayList<>();

    /**
     * Cambia el estado validando que la transición sea legal según
     * {@link EstadoPedido#puedeTransicionarA}. Lanza {@link BusinessRuleException}
     * si la transición no es válida.
     */
    public void transicionarA(EstadoPedido nuevoEstado) {
        if (!estado.puedeTransicionarA(nuevoEstado)) {
            throw new BusinessRuleException(
                "Transición inválida: %s → %s".formatted(estado, nuevoEstado));
        }
        this.estado = nuevoEstado;
        Instant ahora = Instant.now();
        switch (nuevoEstado) {
            case PAGADO_ESPERANDO_COMERCIO, PAGADO_BUSCANDO_REPARTIDOR -> this.pagadoAt = ahora;
            case ACEPTADO                                              -> this.aceptadoAt = ahora;
            case LISTO_PARA_RECOGER, LISTO_PARA_DELIVERY               -> this.listoAt = ahora;
            case ENTREGADO                                             -> this.entregadoAt = ahora;
            case CANCELADO_POR_CLIENTE, CANCELADO_POR_COMERCIO,
                 EXPIRADO                                              -> this.canceladoAt = ahora;
            default -> { /* no-op */ }
        }
    }
}
