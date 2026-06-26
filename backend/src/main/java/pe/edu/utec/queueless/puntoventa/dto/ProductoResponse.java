package pe.edu.utec.queueless.puntoventa.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.utec.queueless.puntoventa.entity.AptitudDietetica;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

/**
 * Datos de un producto que se devuelven al cliente y al comercio. Trae los
 * horarios y ventanas configurados, más dos campos derivados que el service
 * calcula al armar la respuesta mirando la hora actual de Lima: disponibleAhora
 * (si se puede pedir en este momento) y razonNoDisponible (el texto que explica
 * por qué no, cuando corresponde). Es mutable: se arma con el constructor vacío
 * y los setters.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ProductoResponse {
    private Long id;
    private String nombre;
    private String descripcion;
    private BigDecimal precio;
    private String fotoUrl;
    private String categoria;
    private TipoPreparacion tipoPreparacion;
    private Boolean disponible;
    private Set<Alergeno> alergenos;
    private Set<AptitudDietetica> aptitudesDieteticas;
    private ToleranciaPicante nivelPicante;

    private LocalTime horarioServicioInicio;
    private LocalTime horarioServicioFin;
    private Boolean tieneVentanaDePedido;
    private LocalTime ventanaPedidoInicio;
    private LocalTime ventanaPedidoFin;
    private LocalTime ventanaRecojoInicio;
    private LocalTime ventanaRecojoFin;

    private LocalDate vigenciaInicio;
    private LocalDate vigenciaFin;
    private Boolean aceptaProgramado;

    // Derivados, calculados en el service con la hora actual de Lima.
    private Boolean disponibleAhora;
    private String razonNoDisponible;
}
