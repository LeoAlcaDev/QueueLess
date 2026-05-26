package pe.edu.utec.queueless.delivery.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.delivery.event.SolicitudDeliveryCreadaEvent;
import pe.edu.utec.queueless.notification.service.NotificationService;
import pe.edu.utec.queueless.usuario.entity.PerfilRepartidor;
import pe.edu.utec.queueless.usuario.repository.PerfilRepartidorRepository;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RepartidorMatchingServiceTest {

    @Mock private PerfilRepartidorRepository perfilRepartidorRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private RepartidorMatchingService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "timeoutMinutos", 4);
    }

    @Test
    @DisplayName("notifica a cada repartidor disponible")
    void shouldNotificarATodosWhenHayDisponibles() {
        when(perfilRepartidorRepository.findByDisponibleTrue())
            .thenReturn(List.of(repartidor(1L), repartidor(2L), repartidor(3L)));

        service.onSolicitudCreada(new SolicitudDeliveryCreadaEvent(50L));

        verify(notificationService, times(3)).notificar(any());
    }

    @Test
    @DisplayName("sin repartidores disponibles no notifica a nadie")
    void shouldNoNotificarWhenSinDisponibles() {
        when(perfilRepartidorRepository.findByDisponibleTrue()).thenReturn(List.of());

        service.onSolicitudCreada(new SolicitudDeliveryCreadaEvent(50L));

        verify(notificationService, never()).notificar(any());
    }

    private PerfilRepartidor repartidor(Long usuarioId) {
        return PerfilRepartidor.builder().usuarioId(usuarioId).disponible(true).build();
    }
}
