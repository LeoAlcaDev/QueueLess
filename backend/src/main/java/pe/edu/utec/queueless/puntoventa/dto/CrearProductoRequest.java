package pe.edu.utec.queueless.puntoventa.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;

import java.math.BigDecimal;

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
}
