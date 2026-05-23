package pe.edu.utec.queueless.usuario.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Datos del perfil de comercio. Campos espejo de la entidad PerfilComercio, por lo
 * que se construye con ModelMapper.
 */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PerfilComercioResponse {
    private String ruc;
    private String contactoTelefono;
    private String contactoEmail;
}
