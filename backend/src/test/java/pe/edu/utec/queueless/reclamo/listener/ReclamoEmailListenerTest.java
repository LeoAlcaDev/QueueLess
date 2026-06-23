package pe.edu.utec.queueless.reclamo.listener;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.notification.email.EmailService;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.reclamo.entity.DestinatarioReclamo;
import pe.edu.utec.queueless.reclamo.entity.EstadoReclamo;
import pe.edu.utec.queueless.reclamo.entity.Reclamo;
import pe.edu.utec.queueless.reclamo.entity.TipoReclamo;
import pe.edu.utec.queueless.reclamo.event.ReclamoRegistradoEvent;
import pe.edu.utec.queueless.reclamo.service.ReclamoService;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests del enrutamiento del correo de un reclamo recién registrado: un reclamo contra
 * un comercio se notifica al correo del gestor; uno contra la plataforma, al correo de
 * operadores. En ambos casos el acuse va al usuario. Patrón AAA.
 */
class ReclamoEmailListenerTest {

    private static final String OPERADORES_EMAIL = "operadores@queueless.local";

    private EmailService emailService;
    private ReclamoService reclamoService;
    private ReclamoEmailListener listener;

    @BeforeEach
    void setUp() {
        emailService = mock(EmailService.class);
        reclamoService = mock(ReclamoService.class);
        listener = new ReclamoEmailListener(emailService, reclamoService);
        ReflectionTestUtils.setField(listener, "operadoresEmail", OPERADORES_EMAIL);
    }

    @Test
    void unReclamoContraUnComercioNotificaAlGestor() {
        // Arrange
        Reclamo reclamo = reclamoContraComercio("gestor@local");
        when(reclamoService.findById(1L)).thenReturn(reclamo);

        // Act
        listener.onReclamoRegistrado(new ReclamoRegistradoEvent(1L));

        // Assert: acuse al usuario y notificación al correo del gestor del local.
        verify(emailService).sendAcuseReclamo(reclamo);
        verify(emailService).sendNotificacionReclamo("gestor@local", reclamo);
    }

    @Test
    void unReclamoContraLaPlataformaNotificaAOperadores() {
        // Arrange
        Reclamo reclamo = reclamoContraPlataforma();
        when(reclamoService.findById(2L)).thenReturn(reclamo);

        // Act
        listener.onReclamoRegistrado(new ReclamoRegistradoEvent(2L));

        // Assert
        verify(emailService).sendAcuseReclamo(reclamo);
        verify(emailService).sendNotificacionReclamo(OPERADORES_EMAIL, reclamo);
    }

    private Usuario usuario(long id, String email) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setEmail(email);
        usuario.setNombreCompleto("Ana Cliente");
        return usuario;
    }

    private Reclamo reclamoContraComercio(String emailGestor) {
        PuntoDeVenta local = PuntoDeVenta.builder()
            .nombre("Café del Bloque A")
            .ubicacion("Bloque A")
            .gestor(usuario(2L, emailGestor))
            .build();
        local.setId(5L);
        Reclamo reclamo = base()
            .contra(DestinatarioReclamo.COMERCIO)
            .puntoDeVenta(local)
            .build();
        reclamo.setId(1L);
        return reclamo;
    }

    private Reclamo reclamoContraPlataforma() {
        Reclamo reclamo = base()
            .contra(DestinatarioReclamo.PLATAFORMA)
            .build();
        reclamo.setId(2L);
        return reclamo;
    }

    private Reclamo.ReclamoBuilder base() {
        return Reclamo.builder()
            .usuario(usuario(10L, "cliente@local"))
            .tipo(TipoReclamo.RECLAMO)
            .detalle("El almuerzo llegó frío")
            .codigoConstancia("LR-260622-AB7K9")
            .estado(EstadoReclamo.PENDIENTE)
            .plazoRespuestaAt(Instant.now());
    }
}
