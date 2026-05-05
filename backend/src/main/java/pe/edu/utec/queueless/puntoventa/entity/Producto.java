package pe.edu.utec.queueless.puntoventa.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.shared.domain.BaseEntity;

import java.math.BigDecimal;

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
}
