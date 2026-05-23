package pe.edu.utec.queueless.usuario.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas de activacion de roles. Sin Spring ni DB: se mockean los colaboradores.
 * Patron AAA.
 */
@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PerfilService perfilService;

    @InjectMocks
    private UsuarioService usuarioService;

    private Usuario usuarioConRoles(Set<Rol> roles) {
        Usuario usuario = Usuario.builder()
            .email("camila@utec.edu.pe")
            .passwordHash("hash")
            .nombreCompleto("Camila Rojas")
            .roles(new HashSet<>(roles))
            .build();
        usuario.setId(1L);
        return usuario;
    }

    @Test
    @DisplayName("activarRol agrega un rol nuevo y crea su perfil")
    void activarRolNuevo() {
        // Arrange
        Usuario usuario = usuarioConRoles(Set.of(Rol.CLIENTE));
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
        when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuario);

        // Act
        Usuario resultado = usuarioService.activarRol(1L, Rol.REPARTIDOR);

        // Assert
        assertThat(resultado.getRoles()).contains(Rol.CLIENTE, Rol.REPARTIDOR);
        verify(perfilService).crearPerfilParaRol(usuario, Rol.REPARTIDOR);
        verify(usuarioRepository).save(usuario);
    }

    @Test
    @DisplayName("activarRol con un rol ya activo lanza BusinessRuleException y no crea perfil")
    void activarRolDuplicado() {
        // Arrange
        Usuario usuario = usuarioConRoles(Set.of(Rol.CLIENTE));
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));

        // Act + Assert
        assertThatThrownBy(() -> usuarioService.activarRol(1L, Rol.CLIENTE))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("ya tiene activo el rol");

        verify(perfilService, never()).crearPerfilParaRol(any(), any());
        verify(usuarioRepository, never()).save(any());
    }
}
