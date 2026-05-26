package pe.edu.utec.queueless.usuario.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests del repositorio de usuarios contra un Postgres real (slice de JPA).
 */
class UsuarioRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Test
    @DisplayName("findByEmail devuelve el usuario cuando el correo existe")
    void shouldFindByEmailWhenUserExists() {
        usuarioRepository.save(usuario("ana@utec.edu.pe"));

        var encontrado = usuarioRepository.findByEmail("ana@utec.edu.pe");

        assertThat(encontrado).isPresent();
        assertThat(encontrado.get().getNombreCompleto()).isEqualTo("Ana Test");
    }

    @Test
    @DisplayName("findByEmail devuelve vacio cuando el correo no existe")
    void shouldReturnEmptyWhenEmailNotFound() {
        assertThat(usuarioRepository.findByEmail("nadie@utec.edu.pe")).isEmpty();
    }

    @Test
    @DisplayName("existsByEmail es true solo cuando el correo ya esta registrado")
    void shouldDetectExistingEmailWhenRegistered() {
        usuarioRepository.save(usuario("beto@utec.edu.pe"));

        assertThat(usuarioRepository.existsByEmail("beto@utec.edu.pe")).isTrue();
        assertThat(usuarioRepository.existsByEmail("otro@utec.edu.pe")).isFalse();
    }

    @Test
    @DisplayName("guardar persiste los roles del usuario")
    void shouldPersistRolesWhenSaved() {
        Usuario guardado = usuarioRepository.save(usuario("multi@utec.edu.pe"));

        Usuario recuperado = usuarioRepository.findById(guardado.getId()).orElseThrow();
        assertThat(recuperado.getRoles()).containsExactly(Rol.CLIENTE);
    }

    private Usuario usuario(String email) {
        return Usuario.builder()
            .email(email)
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Ana Test")
            .roles(new HashSet<>(Set.of(Rol.CLIENTE)))
            .build();
    }
}
