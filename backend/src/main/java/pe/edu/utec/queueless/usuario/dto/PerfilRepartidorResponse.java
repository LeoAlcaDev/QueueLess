package pe.edu.utec.queueless.usuario.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Datos del perfil de repartidor. Campos espejo de la entidad PerfilRepartidor, por
 * lo que se construye con ModelMapper. La calificacion puede venir null mientras el
 * repartidor no tenga entregas calificadas.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PerfilRepartidorResponse {
    private BigDecimal calificacionPromedio;
    private Integer totalEntregas;
    private Boolean disponible;
}
