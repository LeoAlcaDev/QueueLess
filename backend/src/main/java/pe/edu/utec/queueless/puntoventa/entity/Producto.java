package pe.edu.utec.queueless.puntoventa.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.shared.domain.BaseEntity;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

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

    // Alérgenos que el producto declara contener, de la lista cerrada compartida
    // con el perfil del cliente (ADR-0025). Declararlos es opcional; que la lista
    // esté vacía no significa que el producto no tenga alérgenos.
    @ElementCollection
    @CollectionTable(name = "producto_alergeno",
        joinColumns = @JoinColumn(name = "producto_id"))
    @Column(name = "alergeno", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<Alergeno> alergenos = new HashSet<>();

    // Dietas para las que el producto se declara apto (vegetariano/vegano). Declararlas
    // es opcional y, como con los alérgenos, que la lista esté vacía no afirma que el
    // producto no sea apto: solo que no se declaró (ADR-0025). El sin gluten no vive acá:
    // se resuelve por el alérgeno GLUTEN.
    @ElementCollection
    @CollectionTable(name = "producto_aptitud_dietetica",
        joinColumns = @JoinColumn(name = "producto_id"))
    @Column(name = "aptitud", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<AptitudDietetica> aptitudesDieteticas = new HashSet<>();

    // Nivel de picante del producto en la misma escala con la que el cliente declara su
    // tolerancia, para que comparar uno contra otro sea directo. Nullable: si no se
    // declara, el asistente lo dice en vez de asumir (el cruce vive en ADR-0031).
    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_picante", length = 20)
    private ToleranciaPicante nivelPicante;

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

    // Vigencia por fecha de calendario: el producto se vende solo entre estas
    // fechas. Ambas null = siempre vigente. Es ortogonal al horario del día y a las
    // ventanas de lote (ADR-0026).
    @Column(name = "vigencia_inicio")
    private LocalDate vigenciaInicio;

    @Column(name = "vigencia_fin")
    private LocalDate vigenciaFin;

    // Si el comercio se compromete a preparar este producto con anticipación para
    // un pedido programado. Es una pregunta distinta de la disponibilidad.
    @Column(name = "acepta_programado", nullable = false)
    @Builder.Default
    private Boolean aceptaProgramado = true;
}
