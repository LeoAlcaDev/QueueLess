package pe.edu.utec.queueless.usuario;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.AuthResponse;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.PerfilClienteRepository;
import pe.edu.utec.queueless.usuario.repository.PerfilComercioRepository;
import pe.edu.utec.queueless.usuario.repository.PerfilRepartidorRepository;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.Arrays;
import java.util.HashSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Flujo end-to-end de registro y activacion de roles contra un Postgres real
 * (TestContainers). Cada test corre en su propia transaccion con rollback, asi que
 * la base queda limpia entre casos.
 */
@ActiveProfiles("test")
@Transactional
class PerfilFlowIT extends AbstractIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PerfilClienteRepository perfilClienteRepository;

    @Autowired
    private PerfilComercioRepository perfilComercioRepository;

    @Autowired
    private PerfilRepartidorRepository perfilRepartidorRepository;

    private RegisterRequest registro(String email, Rol... roles) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("password123");
        request.setNombreCompleto("Usuario Demo");
        request.setRoles(new HashSet<>(Arrays.asList(roles)));
        return request;
    }

    @Test
    @DisplayName("register crea el perfil de cada rol y ninguno de los roles ausentes")
    void registerCreaPerfiles() {
        // Arrange
        RegisterRequest request = registro("multi@utec.edu.pe", Rol.CLIENTE, Rol.REPARTIDOR);

        // Act
        AuthResponse response = authService.register(request);

        // Assert
        Long usuarioId = response.getUsuarioId();
        assertThat(response.getToken()).isNotBlank();
        assertThat(perfilClienteRepository.existsById(usuarioId)).isTrue();
        assertThat(perfilRepartidorRepository.existsById(usuarioId)).isTrue();
        assertThat(perfilComercioRepository.existsById(usuarioId)).isFalse();
    }

    @Test
    @DisplayName("activarRol agrega el rol y crea el perfil que faltaba")
    void activarRolCreaPerfil() {
        // Arrange
        AuthResponse response = authService.register(registro("cliente@utec.edu.pe", Rol.CLIENTE));
        Long usuarioId = response.getUsuarioId();

        // Act
        usuarioService.activarRol(usuarioId, Rol.REPARTIDOR);

        // Assert
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow();
        assertThat(usuario.getRoles()).contains(Rol.CLIENTE, Rol.REPARTIDOR);
        assertThat(perfilRepartidorRepository.existsById(usuarioId)).isTrue();
    }

    @Test
    @DisplayName("activarRol con un rol ya activo lanza BusinessRuleException")
    void activarRolDuplicadoFalla() {
        // Arrange
        AuthResponse response = authService.register(registro("dup@utec.edu.pe", Rol.CLIENTE));
        Long usuarioId = response.getUsuarioId();

        // Act + Assert
        assertThatThrownBy(() -> usuarioService.activarRol(usuarioId, Rol.CLIENTE))
            .isInstanceOf(BusinessRuleException.class);
    }
}
