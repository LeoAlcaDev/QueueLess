package pe.edu.utec.queueless.sse;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.sse.dto.CambioEstadoSse;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifica el enrutamiento del listener: ante un cambio de estado resuelve, desde
 * el pedido, al cliente dueño y al comercio (gestor) del local, y le manda el
 * evento solo a esos dos. También que filtra el PENDIENTE_PAGO inicial.
 */
@ExtendWith(MockitoExtension.class)
class PedidoSseListenerTest {

    @Mock
    private RegistroSse registro;

    @Mock
    private PedidoService pedidoService;

    @InjectMocks
    private PedidoSseListener listener;

    @Test
    void reparteAlClienteDuenoYAlComercioDelLocal() {
        // Arrange: pedido 42, del cliente 1, en el local 5 cuyo gestor es el comercio 9.
        Usuario cliente = mock(Usuario.class);
        when(cliente.getId()).thenReturn(1L);
        Usuario gestor = mock(Usuario.class);
        when(gestor.getId()).thenReturn(9L);
        PuntoDeVenta local = mock(PuntoDeVenta.class);
        when(local.getId()).thenReturn(5L);
        when(local.getGestor()).thenReturn(gestor);
        Pedido pedido = mock(Pedido.class);
        when(pedido.getId()).thenReturn(42L);
        when(pedido.getCliente()).thenReturn(cliente);
        when(pedido.getPuntoDeVenta()).thenReturn(local);
        when(pedidoService.findById(42L)).thenReturn(pedido);

        // Act
        listener.onCambioEstado(new PedidoEstadoCambiadoEvent(
            42L, EstadoPedido.ACEPTADO, EstadoPedido.EN_PREPARACION));

        // Assert: al cliente 1 y al comercio 9, a nadie más.
        verify(registro).enviarACliente(eq(1L), any(CambioEstadoSse.class));
        verify(registro).enviarAComercio(eq(9L), any(CambioEstadoSse.class));
    }

    @Test
    void ignoraElPendientePagoInicial() {
        // Act: un cambio a PENDIENTE_PAGO no debe repartirse ni siquiera leer el pedido.
        listener.onCambioEstado(new PedidoEstadoCambiadoEvent(
            42L, null, EstadoPedido.PENDIENTE_PAGO));

        // Assert
        verify(pedidoService, never()).findById(any());
        verify(registro, never()).enviarACliente(any(), any());
        verify(registro, never()).enviarAComercio(any(), any());
    }
}
