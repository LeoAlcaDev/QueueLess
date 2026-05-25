package pe.edu.utec.queueless.delivery.listener;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.service.PedidoService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrearSolicitudDeliveryListenerTest {

    private static final Long PEDIDO_ID = 77L;

    @Mock private SolicitudDeliveryService solicitudDeliveryService;
    @Mock private PedidoService pedidoService;

    @InjectMocks private CrearSolicitudDeliveryListener listener;

    @Test
    @DisplayName("crea la solicitud cuando un pedido DELIVERY entra a buscar repartidor")
    void creaSolicitudCuandoPedidoTransicionaABuscandoRepartidor() {
        Pedido pedido = pedido(TipoEntrega.DELIVERY);
        when(pedidoService.findById(PEDIDO_ID)).thenReturn(pedido);

        listener.onPedidoBuscandoRepartidor(evento(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR));

        verify(solicitudDeliveryService).crearParaPedido(pedido);
    }

    @Test
    @DisplayName("ignora el evento cuando el pedido es de recojo en tienda")
    void ignoraEventoCuandoPedidoEsPickup() {
        Pedido pedido = pedido(TipoEntrega.PICKUP);
        when(pedidoService.findById(PEDIDO_ID)).thenReturn(pedido);

        listener.onPedidoBuscandoRepartidor(evento(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR));

        verify(solicitudDeliveryService, never()).crearParaPedido(any());
    }

    @Test
    @DisplayName("ignora el evento cuando el estado nuevo no es buscar repartidor")
    void ignoraEventoCuandoEstadoNoEsBuscandoRepartidor() {
        listener.onPedidoBuscandoRepartidor(evento(EstadoPedido.ACEPTADO));

        verify(pedidoService, never()).findById(anyLong());
        verify(solicitudDeliveryService, never()).crearParaPedido(any());
    }

    private Pedido pedido(TipoEntrega tipoEntrega) {
        Pedido pedido = Pedido.builder().tipoEntrega(tipoEntrega).build();
        pedido.setId(PEDIDO_ID);
        return pedido;
    }

    private PedidoEstadoCambiadoEvent evento(EstadoPedido estadoNuevo) {
        return new PedidoEstadoCambiadoEvent(PEDIDO_ID, EstadoPedido.PENDIENTE_PAGO, estadoNuevo);
    }
}
