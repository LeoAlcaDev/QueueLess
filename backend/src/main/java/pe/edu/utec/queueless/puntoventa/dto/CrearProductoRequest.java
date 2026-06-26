package pe.edu.utec.queueless.puntoventa.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.puntoventa.entity.AptitudDietetica;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Getter @Setter
public class CrearProductoRequest {

    @NotNull(message = "El punto de venta es obligatorio")
    private Long puntoDeVentaId;

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
    private String nombre;

    private String descripcion;

    @NotNull(message = "El precio es obligatorio")
    @DecimalMin(value = "0.0", message = "El precio no puede ser negativo")
    @DecimalMax(value = "9999.99", message = "El precio no puede superar 9999.99")
    @Digits(integer = 4, fraction = 2, message = "El precio admite hasta 4 enteros y 2 decimales")
    private BigDecimal precio;

    @Size(max = 50, message = "La categoria no puede superar 50 caracteres")
    private String categoria;

    @NotNull(message = "El tipo de preparacion es obligatorio")
    private TipoPreparacion tipoPreparacion;

    // Alérgenos que el producto declara contener (opcional, de la lista cerrada).
    private Set<@NotNull Alergeno> alergenos;

    // Dietas para las que el comercio declara apto el producto (opcional).
    private Set<@NotNull AptitudDietetica> aptitudesDieteticas;

    // Nivel de picante del producto (opcional), en la misma escala que la tolerancia del cliente.
    private ToleranciaPicante nivelPicante;

    // Horario de servicio (opcional). Las ventanas por lote aplican solo cuando
    // tieneVentanaDePedido es true. Las combinaciones válidas se validan en el service.
    private LocalTime horarioServicioInicio;
    private LocalTime horarioServicioFin;

    private Boolean tieneVentanaDePedido;
    private LocalTime ventanaPedidoInicio;
    private LocalTime ventanaPedidoFin;
    private LocalTime ventanaRecojoInicio;
    private LocalTime ventanaRecojoFin;

    // Vigencia por fecha (opcional; ambas null = siempre vigente) y si el producto
    // acepta pedidos programados (default true cuando no se envía).
    private LocalDate vigenciaInicio;
    private LocalDate vigenciaFin;
    private Boolean aceptaProgramado;
}
