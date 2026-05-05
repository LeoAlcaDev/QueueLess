package pe.edu.utec.queueless.puntoventa.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.shared.domain.BaseEntity;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "punto_de_venta")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PuntoDeVenta extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(nullable = false, length = 200)
    private String ubicacion;

    @Column(name = "horario_apertura")
    private LocalTime horarioApertura;

    @Column(name = "horario_cierre")
    private LocalTime horarioCierre;

    /** Tiempo promedio declarado (Fase 1 del modelo de tiempos), en minutos. */
    @Column(name = "tiempo_promedio_declarado", nullable = false)
    @Builder.Default
    private Integer tiempoPromedioDeclarado = 10;

    @Column(nullable = false)
    @Builder.Default
    private Boolean abierto = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gestor_usuario_id", nullable = false)
    private Usuario gestor;

    @OneToMany(mappedBy = "puntoDeVenta", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Producto> productos = new ArrayList<>();
}
