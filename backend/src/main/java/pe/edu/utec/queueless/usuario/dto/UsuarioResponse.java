package pe.edu.utec.queueless.usuario.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.usuario.entity.Rol;

import java.util.Set;

@Getter
@Builder
@AllArgsConstructor
public class UsuarioResponse {
    private final Long id;
    private final String email;
    private final String nombreCompleto;
    private final Set<Rol> roles;
}
