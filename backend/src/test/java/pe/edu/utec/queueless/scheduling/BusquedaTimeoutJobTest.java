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
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;
import pe.edu.utec.queueless.notification.service.NotificationService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusquedaTimeoutJobTest {

    private static final Long SOLICITUD_ID = 50L;
    private static final Long CLIENTE_ID = 10L;

    @Mock private SolicitudDeliveryRepository repository;
    @Mock private SolicitudDeliveryService solicitudDeliveryService;
    @Mock private NotificationService notificationService;

    @InjectMocks private BusquedaTimeoutJob job;

    @Test
    @DisplayName("una búsqueda que el service degrada termina avisando al cliente que devolvió")
    void degradaYNotificaAlClienteDelService() {
        SolicitudDelivery solicitud = solicitudVencida();
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of(solicitud));
        when(solicitudDeliveryService.expirarBusqueda(SOLICITUD_ID)).thenReturn(Optional.of(CLIENTE_ID));

        job.procesarTimeouts();

        verify(solicitudDeliveryService).expirarBusqueda(SOLICITUD_ID);
        verify(notificationService).notificar(any());
    }

    @Test
    @DisplayName("sin búsquedas vencidas el job no expira ni notifica nada")
    void noTocaSolicitudesAsignadas() {
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of());

        job.procesarTimeouts();

        verify(solicitudDeliveryService, never()).expirarBusqueda(anyLong());
        verify(notificationService, never()).notificar(any());
    }

    @Test
    @DisplayName("si el service no degrada (Optional vacío) el job no notifica")
    void noNotificaCuandoElServiceNoDegrada() {
        SolicitudDelivery solicitud = solicitudVencida();
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of(solicitud));
        when(solicitudDeliveryService.expirarBusqueda(SOLICITUD_ID)).thenReturn(Optional.empty());

        job.procesarTimeouts();

        verify(solicitudDeliveryService).expirarBusqueda(SOLICITUD_ID);
        verify(notificationService, never()).notificar(any());
    }

    @Test
    @DisplayName("correr el job dos veces notifica una sola vez: la segunda el service ya no degrada")
    void procesarTimeoutsEsIdempotente() {
        SolicitudDelivery solicitud = solicitudVencida();
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of(solicitud))
            .thenReturn(List.of(solicitud));
        when(solicitudDeliveryService.expirarBusqueda(SOLICITUD_ID))
            .thenReturn(Optional.of(CLIENTE_ID))
            .thenReturn(Optional.empty());

        job.procesarTimeouts();
        job.procesarTimeouts();

        verify(notificationService, times(1)).notificar(any());
    }

    @Test
    @DisplayName("el job no transiciona el pedido: sigue buscando repartidor")
    void noTransicionaElPedido() {
        SolicitudDelivery solicitud = solicitudVencida();
        when(repository.findByEstadoAndBusquedaFinAtBefore(eq(EstadoSolicitudDelivery.BUSCANDO), any()))
            .thenReturn(List.of(solicitud));
        when(solicitudDeliveryService.expirarBusqueda(SOLICITUD_ID)).thenReturn(Optional.of(CLIENTE_ID));

        job.procesarTimeouts();

        assertThat(solicitud.getPedido().getEstado()).isEqualTo(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
    }

    private SolicitudDelivery solicitudVencida() {
        Pedido pedido = Pedido.builder()
            .codigo("QL-1").estado(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR).build();
        pedido.setId(77L);
        Instant ahora = Instant.now();
        SolicitudDelivery solicitud = SolicitudDelivery.builder()
            .pedido(pedido).zonaEntrega("Bloque A").estado(EstadoSolicitudDelivery.BUSCANDO)
            .busquedaInicioAt(ahora.minus(10, ChronoUnit.MINUTES))
            .busquedaFinAt(ahora.minus(5, ChronoUnit.MINUTES)).build();
        solicitud.setId(SOLICITUD_ID);
        return solicitud;
    }
}
