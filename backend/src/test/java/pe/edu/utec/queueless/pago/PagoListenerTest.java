package pe.edu.utec.queueless.pago;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.pago.listener.PagoListener;
import pe.edu.utec.queueless.pago.service.ReembolsoService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PagoListenerTest {

    @Mock private ReembolsoService reembolsoService;
    @InjectMocks private PagoListener pagoListener;

    @Test
    @DisplayName("cancelación desde PAGADO_BUSCANDO_REPARTIDOR dispara reembolso")
    void cancelacionDesdePagadoBuscandoRepartidorGatillaReembolso() {
        pagoListener.onCambioEstadoPedido(evento(
            EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR, EstadoPedido.CANCELADO_POR_CLIENTE));
        verify(reembolsoService).emitirReembolso(1L);
    }

    @Test
    @DisplayName("cancelación desde PAGADO_ESPERANDO_COMERCIO dispara reembolso")
    void cancelacionDesdePagadoEsperandoComercioGatillaReembolso() {
        pagoListener.onCambioEstadoPedido(evento(
            EstadoPedido.PAGADO_ESPERANDO_COMERCIO, EstadoPedido.CANCELADO_POR_COMERCIO));
        verify(reembolsoService).emitirReembolso(1L);
    }

    @Test
    @DisplayName("cancelación desde ACEPTADO dispara reembolso")
    void cancelacionDesdeAceptadoGatillaReembolso() {
        pagoListener.onCambioEstadoPedido(evento(
            EstadoPedido.ACEPTADO, EstadoPedido.CANCELADO_POR_COMERCIO));
        verify(reembolsoService).emitirReembolso(1L);
    }

    @Test
    @DisplayName("cancelación desde EN_PREPARACION dispara reembolso")
    void cancelacionDesdeEnPreparacionGatillaReembolso() {
        pagoListener.onCambioEstadoPedido(evento(
            EstadoPedido.EN_PREPARACION, EstadoPedido.CANCELADO_POR_COMERCIO));
        verify(reembolsoService).emitirReembolso(1L);
    }

    @Test
    @DisplayName("cancelación desde PENDIENTE_PAGO no dispara reembolso (sin pago confirmado)")
    void cancelacionDesdePendientePagoNoGatillaReembolso() {
        pagoListener.onCambioEstadoPedido(evento(
            EstadoPedido.PENDIENTE_PAGO, EstadoPedido.CANCELADO_POR_CLIENTE));
        verify(reembolsoService, never()).emitirReembolso(anyLong());
    }

    @Test
    @DisplayName("transición no cancela (PAGADO_ESPERANDO_COMERCIO → ACEPTADO) no dispara reembolso")
    void transicionNoEsCancelacionNoGatillaReembolso() {
        pagoListener.onCambioEstadoPedido(evento(
            EstadoPedido.PAGADO_ESPERANDO_COMERCIO, EstadoPedido.ACEPTADO));
        verify(reembolsoService, never()).emitirReembolso(anyLong());
    }

    private PedidoEstadoCambiadoEvent evento(EstadoPedido anterior, EstadoPedido nuevo) {
        return new PedidoEstadoCambiadoEvent(1L, anterior, nuevo);
    }
}
