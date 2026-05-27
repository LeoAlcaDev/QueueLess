package pe.edu.utec.queueless.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.usuario.entity.Rol;

import java.util.Set;

@Getter
@Builder
@AllArgsConstructor
public class AuthResponse {
    private final String accessToken;
    private final String refreshToken;
    private final Long usuarioId;
    private final String email;
    private final String nombreCompleto;
    private final Set<Rol> roles;
}
