package pe.edu.utec.queueless.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.usuario.entity.Rol;

import java.util.Set;

@Getter @Setter
public class RegisterRequest {

    @NotBlank
    @Email(message = "El correo debe tener formato válido")
    private String email;

    @NotBlank
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    private String password;

    @NotBlank
    private String nombreCompleto;

    @NotEmpty(message = "Debe activar al menos un rol")
    private Set<Rol> roles;
}
