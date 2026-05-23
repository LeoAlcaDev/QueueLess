package pe.edu.utec.queueless.usuario.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Datos del perfil de cliente. Campos espejo de la entidad PerfilCliente, por lo
 * que se construye con ModelMapper.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PerfilClienteResponse {
    private String direccionPreferida;
    private String alergias;
    private Integer totalPedidos;
}
