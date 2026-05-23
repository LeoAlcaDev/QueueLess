package pe.edu.utec.queueless.usuario.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ActualizarPerfilComercioRequest {

    // RUC peruano: 11 digitos que empiezan con 10 (persona natural) o 20 (persona juridica).
    @NotBlank(message = "El RUC es obligatorio")
    @Pattern(regexp = "^(10|20)\\d{9}$",
             message = "El RUC debe tener 11 digitos y empezar con 10 o 20")
    private String ruc;

    @Size(max = 20, message = "El telefono no puede superar 20 caracteres")
    private String contactoTelefono;

    @Email(message = "El correo de contacto debe tener formato valido")
    @Size(max = 150, message = "El correo no puede superar 150 caracteres")
    private String contactoEmail;
}
