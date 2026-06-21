package pe.edu.utec.queueless.usuario.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Datos del perfil de comercio. Los primeros campos son espejo de la entidad
 * PerfilComercio (los arma ModelMapper); la tasa de cumplimiento se calcula aparte y
 * se setea sobre el response ya mapeado. Puede venir null cuando todavía no hay datos
 * suficientes ("sin datos aún", ADR-0026).
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PerfilComercioResponse {
    private String ruc;
    private String contactoTelefono;
    private String contactoEmail;
    private BigDecimal tasaCumplimiento;
}
