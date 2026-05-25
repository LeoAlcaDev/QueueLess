package pe.edu.utec.queueless.puntoventa.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.shared.domain.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "producto")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Producto extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "punto_de_venta_id", nullable = false)
    private PuntoDeVenta puntoDeVenta;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal precio;

    @Column(name = "foto_url", length = 500)
    private String fotoUrl;

    @Column(length = 50)
    private String categoria;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_preparacion", nullable = false, length = 20)
    private TipoPreparacion tipoPreparacion;

    @Column(nullable = false)
    @Builder.Default
    private Boolean disponible = true;

    // Horario de servicio: si ambos tienen valor, el producto se vende solo entre
    // esas horas. Ambos null = se vende todo el día que el local esté abierto.
    @Column(name = "horario_servicio_inicio")
    private LocalTime horarioServicioInicio;

    @Column(name = "horario_servicio_fin")
    private LocalTime horarioServicioFin;

    // Producto por lote: cuando el flag está en true, las 4 ventanas son
    // obligatorias (se valida en el service). Cuando está en false, se ignoran.
    @Column(name = "tiene_ventana_de_pedido", nullable = false)
    @Builder.Default
    private Boolean tieneVentanaDePedido = false;

    @Column(name = "ventana_pedido_inicio")
    private LocalTime ventanaPedidoInicio;

    @Column(name = "ventana_pedido_fin")
    private LocalTime ventanaPedidoFin;

    @Column(name = "ventana_recojo_inicio")
    private LocalTime ventanaRecojoInicio;

    @Column(name = "ventana_recojo_fin")
    private LocalTime ventanaRecojoFin;
}
