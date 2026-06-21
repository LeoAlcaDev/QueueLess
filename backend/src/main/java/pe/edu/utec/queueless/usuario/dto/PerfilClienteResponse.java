package pe.edu.utec.queueless.usuario.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.RestriccionDietetica;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Datos del perfil de cliente. Campos espejo de la entidad PerfilCliente, por lo
 * que se construye con ModelMapper.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PerfilClienteResponse {
    private String direccionPreferida;
    private String alergias;
    private Set<Alergeno> alergenosEvitar;
    private Set<RestriccionDietetica> restriccionesDieteticas;
    private ToleranciaPicante toleranciaPicante;
    private BigDecimal presupuestoReferencia;
    private Integer totalPedidos;
}
