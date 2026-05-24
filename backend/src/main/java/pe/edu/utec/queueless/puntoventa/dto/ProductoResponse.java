package pe.edu.utec.queueless.puntoventa.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;

import java.math.BigDecimal;

/**
 * Datos de un producto. Sus campos son espejo de la entidad Producto, por eso se
 * arma con ModelMapper (mismo patron que los Perfil*Response). Por eso tambien es
 * mutable: ModelMapper construye con el constructor vacio y luego usa los setters.
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
}
