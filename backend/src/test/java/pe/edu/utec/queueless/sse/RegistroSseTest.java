package pe.edu.utec.queueless.sse;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.sse.dto.CambioEstadoSse;

import java.io.IOException;
import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * El test crítico del SSE: el aislamiento por dueño. Un evento se reparte solo a
 * los emisores del dueño correcto (un cliente no recibe lo de otro cliente; un
 * comercio no recibe lo de otro comercio), y un emisor que falla al enviar se
 * suelta del registro para no quedar colgado.
 */
class RegistroSseTest {

    private final RegistroSse registro = new RegistroSse();

    private CambioEstadoSse eventoCualquiera() {
        return CambioEstadoSse.builder()
            .pedidoId(42L)
            .estadoAnterior(EstadoPedido.ACEPTADO)
            .estadoNuevo(EstadoPedido.EN_PREPARACION)
            .puntoDeVentaId(5L)
            .ocurridoAt(Instant.EPOCH)
            .build();
    }

    @Test
    void unClienteSoloRecibeSusPropiosEventos() throws IOException {
        // Arrange
        SseEmitter clienteA = mock(SseEmitter.class);
        SseEmitter clienteB = mock(SseEmitter.class);
        registro.registrarCliente(1L, clienteA);
        registro.registrarCliente(2L, clienteB);

        // Act
        registro.enviarACliente(1L, eventoCualquiera());

        // Assert
        verify(clienteA).send(any(SseEmitter.SseEventBuilder.class));
        verify(clienteB, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void unComercioSoloRecibeLosEventosDeSusLocales() throws IOException {
        // Arrange
        SseEmitter comercioX = mock(SseEmitter.class);
        SseEmitter comercioY = mock(SseEmitter.class);
        registro.registrarComercio(9L, comercioX);
        registro.registrarComercio(8L, comercioY);

        // Act
        registro.enviarAComercio(9L, eventoCualquiera());

        // Assert
        verify(comercioX).send(any(SseEmitter.SseEventBuilder.class));
        verify(comercioY, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void losStreamsDeClienteYComercioNoSeMezclan() throws IOException {
        // Un mismo id usado como cliente y como comercio son dos registros distintos.
        SseEmitter comoCliente = mock(SseEmitter.class);
        SseEmitter comoComercio = mock(SseEmitter.class);
        registro.registrarCliente(1L, comoCliente);
        registro.registrarComercio(1L, comoComercio);

        registro.enviarACliente(1L, eventoCualquiera());

        verify(comoCliente).send(any(SseEmitter.SseEventBuilder.class));
        verify(comoComercio, never()).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void unEmisorQueFallaAlEnviarSeSueltaDelRegistro() throws IOException {
        // Arrange: dos conexiones del mismo cliente; una falla al enviar.
        SseEmitter bueno = mock(SseEmitter.class);
        SseEmitter caido = mock(SseEmitter.class);
        doThrow(new IOException("el cliente se fue"))
            .when(caido).send(any(SseEmitter.SseEventBuilder.class));
        registro.registrarCliente(1L, bueno);
        registro.registrarCliente(1L, caido);

        // Act: dos envíos seguidos.
        registro.enviarACliente(1L, eventoCualquiera());
        registro.enviarACliente(1L, eventoCualquiera());

        // Assert: el caído se intentó una sola vez (se soltó al fallar); el bueno, las dos.
        verify(caido, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(bueno, times(2)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void unEmisorQueFallaAlEnviarSeCierraConCompleteWithError() throws IOException {
        // Arrange: una conexión que revienta al enviar.
        SseEmitter caido = mock(SseEmitter.class);
        IOException fallo = new IOException("el cliente se fue");
        doThrow(fallo).when(caido).send(any(SseEmitter.SseEventBuilder.class));
        registro.registrarCliente(1L, caido);

        // Act: dos envíos seguidos.
        registro.enviarACliente(1L, eventoCualquiera());
        registro.enviarACliente(1L, eventoCualquiera());

        // Assert: se cerró con el error y, al haberse soltado, el segundo envío ya no lo toca.
        verify(caido).completeWithError(fallo);
        verify(caido, times(1)).send(any(SseEmitter.SseEventBuilder.class));
    }
}
