package pe.edu.utec.queueless.puntoventa.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;

import java.math.BigDecimal;

@Getter
@Builder
@AllArgsConstructor
public class ProductoResponse {
    private final Long id;
    private final String nombre;
    private final String descripcion;
    private final BigDecimal precio;
    private final String fotoUrl;
    private final String categoria;
    private final TipoPreparacion tipoPreparacion;
    private final Boolean disponible;
}
