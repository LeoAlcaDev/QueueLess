package pe.edu.utec.queueless.pedido.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.puntoventa.entity.Producto;

import java.math.BigDecimal;

@Entity
@Table(name = "item_pedido")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ItemPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id", nullable = false)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(nullable = false)
    private Integer cantidad;

    @Column(name = "precio_unitario", nullable = false, precision = 8, scale = 2)
    private BigDecimal precioUnitario;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal subtotal;
}
