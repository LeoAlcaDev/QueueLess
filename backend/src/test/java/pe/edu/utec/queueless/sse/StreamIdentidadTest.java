package pe.edu.utec.queueless.sse;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * La identidad del suscriptor sale del usuario autenticado, no de un parámetro:
 * los endpoints de stream no reciben ningún id, así que estructuralmente nadie
 * puede abrir el stream de otro. Comprobamos que cada controller registre la
 * conexión bajo el id del principal.
 */
@ExtendWith(MockitoExtension.class)
class StreamIdentidadTest {

    @Mock
    private RegistroSse registro;

    @Mock
    private UsuarioService usuarioService;

    @Test
    void elClienteSeRegistraBajoElIdDeSuPrincipal() {
        // Arrange
        Usuario cliente = mock(Usuario.class);
        when(cliente.getId()).thenReturn(1L);
        when(usuarioService.findByEmail("ana@utec.edu.pe")).thenReturn(cliente);
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("ana@utec.edu.pe");
        ClientePedidoStreamController controller =
            new ClientePedidoStreamController(registro, usuarioService);

        // Act
        SseEmitter emitter = controller.stream(auth);

        // Assert
        assertThat(emitter).isNotNull();
        verify(registro).registrarCliente(eq(1L), any(SseEmitter.class));
    }

    @Test
    void elComercioSeRegistraBajoElIdDeSuPrincipal() {
        // Arrange
        Usuario comercio = mock(Usuario.class);
        when(comercio.getId()).thenReturn(9L);
        when(usuarioService.findByEmail("local@utec.edu.pe")).thenReturn(comercio);
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("local@utec.edu.pe");
        ComercioPedidoStreamController controller =
            new ComercioPedidoStreamController(registro, usuarioService);

        // Act
        SseEmitter emitter = controller.stream(auth);

        // Assert
        assertThat(emitter).isNotNull();
        verify(registro).registrarComercio(eq(9L), any(SseEmitter.class));
    }
}
