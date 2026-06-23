package pe.edu.utec.queueless.tyc.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.tyc.dto.TycEstadoResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests del registro de aceptación de los Términos y Condiciones. No levanta Spring ni
 * base: el repositorio va mockeado y la versión vigente se inyecta por reflexión. Patrón AAA.
 */
class TycServiceTest {

    private static final String EMAIL = "ana@utec.edu.pe";
    private static final String VERSION_VIGENTE = "2026-06-23";

    private UsuarioRepository usuarioRepository;
    private TycService service;

    @BeforeEach
    void setUp() {
        usuarioRepository = mock(UsuarioRepository.class);
        service = new TycService(usuarioRepository);
        ReflectionTestUtils.setField(service, "versionVigente", VERSION_VIGENTE);
    }

    @Test
    void aceptarGuardaLaVersionVigenteYLaFechaYSeLeeDeVuelta() {
        // Arrange: un usuario que nunca aceptó.
        Usuario usuario = usuarioSinAceptar();
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));

        // Act
        TycEstadoResponse acuse = service.aceptar(EMAIL);

        // Assert: quedó registrada la versión vigente con su fecha.
        assertThat(acuse.getVersionAceptada()).isEqualTo(VERSION_VIGENTE);
        assertThat(acuse.getAceptadoAt()).isNotNull();
        assertThat(acuse.isAceptoVersionVigente()).isTrue();
        verify(usuarioRepository).save(usuario);

        // Y se puede leer de vuelta.
        TycEstadoResponse estado = service.verEstado(EMAIL);
        assertThat(estado.getVersionAceptada()).isEqualTo(VERSION_VIGENTE);
        assertThat(estado.getAceptadoAt()).isNotNull();
    }

    @Test
    void aceptarDeNuevoActualizaALaVersionVigente() {
        // Arrange: un usuario que aceptó una versión vieja.
        Usuario usuario = usuarioSinAceptar();
        usuario.setTycVersionAceptada("2026-01-01");
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));
        // Antes de reaceptar, no está al día con la versión vigente.
        assertThat(service.verEstado(EMAIL).isAceptoVersionVigente()).isFalse();

        // Act
        TycEstadoResponse acuse = service.aceptar(EMAIL);

        // Assert: la aceptación se movió a la versión vigente.
        assertThat(acuse.getVersionAceptada()).isEqualTo(VERSION_VIGENTE);
        assertThat(acuse.isAceptoVersionVigente()).isTrue();
    }

    @Test
    void unUsuarioSinAceptarConsultaSuEstadoSinQueNadaLoBloquee() {
        // Arrange: nunca aceptó.
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuarioSinAceptar()));

        // Act: solo consulta; el registro de TyC no obliga ni bloquea ninguna operación.
        TycEstadoResponse estado = service.verEstado(EMAIL);

        // Assert: responde el estado "no aceptó" sin lanzar nada.
        assertThat(estado.getVersionVigente()).isEqualTo(VERSION_VIGENTE);
        assertThat(estado.getVersionAceptada()).isNull();
        assertThat(estado.getAceptadoAt()).isNull();
        assertThat(estado.isAceptoVersionVigente()).isFalse();
    }

    private Usuario usuarioSinAceptar() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setEmail(EMAIL);
        usuario.setNombreCompleto("Ana Cliente");
        return usuario;
    }
}
