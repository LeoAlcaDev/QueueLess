package pe.edu.utec.queueless.scheduling;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.notification.service.NotificationService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusquedaTimeoutJobTest {

    @Mock private SolicitudDeliveryRepository repository;
    @Mock private NotificationService notificationService;

    @InjectMocks private BusquedaTimeoutJob job;

    @Test
    @DisplayName("una búsqueda vencida pasa a SIN_REPARTIDOR y avisa al cliente")
    void marcaSolicitudComoSinRepartidorYNotifica() {
        SolicitudDelivery solicitud = solicitudVencida(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of(solicitud));

        job.procesarTimeouts();

        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudDelivery.SIN_REPARTIDOR);
        verify(repository).save(solicitud);
        verify(notificationService).notificar(any());
    }

    @Test
    @DisplayName("el job solo mira las búsquedas (no las solicitudes ya asignadas)")
    void noTocaSolicitudesAsignadas() {
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of());

        job.procesarTimeouts();

        verify(repository).findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any());
        verify(repository, never()).save(any());
        verify(notificationService, never()).notificar(any());
    }

    @Test
    @DisplayName("el timeout no transiciona el pedido: sigue buscando repartidor")
    void noTransicionaElPedido() {
        SolicitudDelivery solicitud = solicitudVencida(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of(solicitud));

        job.procesarTimeouts();

        assertThat(solicitud.getPedido().getEstado()).isEqualTo(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
    }

    @Test
    @DisplayName("correr el job dos veces no re-marca ni re-notifica la misma solicitud")
    void procesarTimeoutsEsIdempotente() {
        SolicitudDelivery solicitud = solicitudVencida(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of(solicitud))
            .thenReturn(List.of());

        job.procesarTimeouts();
        job.procesarTimeouts();

        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudDelivery.SIN_REPARTIDOR);
        verify(notificationService, times(1)).notificar(any());
    }

    private SolicitudDelivery solicitudVencida(EstadoPedido estadoPedido) {
        Usuario cliente = Usuario.builder().email("cli@utec.edu.pe").build();
        cliente.setId(10L);
        Pedido pedido = Pedido.builder().codigo("QL-1").cliente(cliente).estado(estadoPedido).build();
        pedido.setId(77L);
        Instant ahora = Instant.now();
        SolicitudDelivery solicitud = SolicitudDelivery.builder()
            .pedido(pedido).zonaEntrega("Bloque A").estado(EstadoSolicitudDelivery.BUSCANDO)
            .busquedaInicioAt(ahora.minus(10, ChronoUnit.MINUTES))
            .busquedaFinAt(ahora.minus(5, ChronoUnit.MINUTES)).build();
        solicitud.setId(50L);
        return solicitud;
    }
}
