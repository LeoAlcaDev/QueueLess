package pe.edu.utec.queueless.delivery;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import pe.edu.utec.queueless.delivery.dto.SolicitudDeliveryResponse;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SolicitudDeliveryServiceTest {

    private static final Long SOLICITUD_ID = 50L;
    private static final Long PEDIDO_ID = 77L;

    @Mock private SolicitudDeliveryRepository repository;
    @Mock private PedidoService pedidoService;
    @Mock private ApplicationEventPublisher eventPublisher;

    @InjectMocks private SolicitudDeliveryService service;

    @Test
    @DisplayName("aceptar deja la solicitud ASIGNADA y transiciona el pedido a esperar al comercio")
    void aceptarTransicionaPedidoAEsperandoComercio() {
        Usuario repartidor = repartidor();
        Pedido pedido = pedidoConLocal(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
        SolicitudDelivery solicitud = solicitud(EstadoSolicitudDelivery.BUSCANDO, pedido);
        when(repository.findByIdForUpdate(SOLICITUD_ID)).thenReturn(Optional.of(solicitud));
        when(repository.save(solicitud)).thenReturn(solicitud);

        SolicitudDeliveryResponse response = service.aceptar(repartidor, SOLICITUD_ID);

        assertThat(response.getEstado()).isEqualTo(EstadoSolicitudDelivery.ASIGNADO);
        assertThat(response.getRepartidorId()).isEqualTo(repartidor.getId());
        verify(pedidoService).cambiarEstado(PEDIDO_ID, EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
    }

    @Test
    @DisplayName("aceptar una solicitud que ya no está BUSCANDO falla y no toca el pedido")
    void aceptarSolicitudYaTomadaFalla() {
        Usuario repartidor = repartidor();
        SolicitudDelivery solicitud =
            solicitud(EstadoSolicitudDelivery.ASIGNADO, pedidoConLocal(EstadoPedido.PAGADO_ESPERANDO_COMERCIO));
        when(repository.findByIdForUpdate(SOLICITUD_ID)).thenReturn(Optional.of(solicitud));

        assertThatThrownBy(() -> service.aceptar(repartidor, SOLICITUD_ID))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("ya no está disponible");
        verify(pedidoService, never()).cambiarEstado(any(), any());
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("cambiar a pickup cancela la solicitud y delega el cambio del pedido")
    void cambiarAPickupCancelaSolicitudYTransicionaPedido() {
        Usuario cliente = cliente();
        Pedido pedido = pedidoConLocal(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
        SolicitudDelivery solicitud = solicitud(EstadoSolicitudDelivery.BUSCANDO, pedido);
        PedidoResponse pedidoResponse = mock(PedidoResponse.class);
        when(pedidoService.buscarPedidoDelCliente(cliente, PEDIDO_ID)).thenReturn(pedido);
        when(pedidoService.cambiarAPickup(pedido)).thenReturn(pedidoResponse);
        when(repository.findByPedidoId(PEDIDO_ID)).thenReturn(Optional.of(solicitud));

        PedidoResponse response = service.cambiarAPickup(cliente, PEDIDO_ID);

        assertThat(response).isSameAs(pedidoResponse);
        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudDelivery.CANCELADO);
        verify(pedidoService).cambiarAPickup(pedido);
        verify(repository).save(solicitud);
    }

    @Test
    @DisplayName("reintentar mientras la búsqueda sigue vigente falla y no republica el evento")
    void reintentarBusquedaConSolicitudActivaFalla() {
        Usuario cliente = cliente();
        Pedido pedido = pedidoSimple(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
        SolicitudDelivery solicitud = solicitud(EstadoSolicitudDelivery.BUSCANDO, pedido);
        solicitud.setBusquedaFinAt(Instant.now().plus(2, ChronoUnit.MINUTES));
        when(pedidoService.buscarPedidoDelCliente(cliente, PEDIDO_ID)).thenReturn(pedido);
        when(repository.findByPedidoId(PEDIDO_ID)).thenReturn(Optional.of(solicitud));

        assertThatThrownBy(() -> service.reintentarBusqueda(cliente, PEDIDO_ID))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("sigue activa");
        verify(eventPublisher, never()).publishEvent(any());
        verify(repository, never()).save(any());
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private Usuario repartidor() {
        Usuario repartidor = Usuario.builder()
            .email("rep@utec.edu.pe").roles(Set.of(Rol.REPARTIDOR)).build();
        repartidor.setId(1L);
        return repartidor;
    }

    private Usuario cliente() {
        Usuario cliente = Usuario.builder()
            .email("cli@utec.edu.pe").roles(Set.of(Rol.CLIENTE)).build();
        cliente.setId(10L);
        return cliente;
    }

    private Pedido pedidoConLocal(EstadoPedido estado) {
        Usuario gestor = Usuario.builder().email("g@utec.edu.pe").build();
        gestor.setId(20L);
        PuntoDeVenta local = PuntoDeVenta.builder().nombre("Local").ubicacion("Bloque A").gestor(gestor).build();
        local.setId(5L);
        Pedido pedido = Pedido.builder()
            .codigo("QL-1").puntoDeVenta(local).estado(estado).tipoEntrega(TipoEntrega.DELIVERY).build();
        pedido.setId(PEDIDO_ID);
        return pedido;
    }

    private Pedido pedidoSimple(EstadoPedido estado) {
        Pedido pedido = Pedido.builder().codigo("QL-1").estado(estado).tipoEntrega(TipoEntrega.DELIVERY).build();
        pedido.setId(PEDIDO_ID);
        return pedido;
    }

    private SolicitudDelivery solicitud(EstadoSolicitudDelivery estado, Pedido pedido) {
        Instant ahora = Instant.now();
        SolicitudDelivery solicitud = SolicitudDelivery.builder()
            .pedido(pedido).zonaEntrega("Bloque A").estado(estado)
            .busquedaInicioAt(ahora).busquedaFinAt(ahora.plus(4, ChronoUnit.MINUTES)).build();
        solicitud.setId(SOLICITUD_ID);
        return solicitud;
    }
}
