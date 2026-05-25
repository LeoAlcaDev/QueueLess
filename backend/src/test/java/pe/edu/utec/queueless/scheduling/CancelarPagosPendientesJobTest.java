package pe.edu.utec.queueless.scheduling;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * El job que cierra los pedidos abandonados sin pagar. Colaboradores mockeados.
 */
@ExtendWith(MockitoExtension.class)
class CancelarPagosPendientesJobTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PedidoService pedidoService;

    @InjectMocks private CancelarPagosPendientesJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "cancelacionMinutos", 60);
    }

    @Test
    @DisplayName("un pedido viejo sin pagar se cancela como cancelado por el cliente")
    void cancelaPedidoViejo() {
        when(pedidoRepository.findByEstadoAndCreadoAtBefore(eq(EstadoPedido.PENDIENTE_PAGO), any()))
            .thenReturn(List.of(pedido(7L)));

        job.cancelarPendientes();

        verify(pedidoService).cambiarEstado(7L, EstadoPedido.CANCELADO_POR_CLIENTE);
    }

    @Test
    @DisplayName("sin pedidos abandonados no cancela nada")
    void sinCandidatosNoHaceNada() {
        when(pedidoRepository.findByEstadoAndCreadoAtBefore(eq(EstadoPedido.PENDIENTE_PAGO), any()))
            .thenReturn(List.of());

        job.cancelarPendientes();

        verify(pedidoService, never()).cambiarEstado(any(), any());
    }

    @Test
    @DisplayName("cancela todos los pedidos abandonados que encuentra")
    void cancelaTodosLosCandidatos() {
        when(pedidoRepository.findByEstadoAndCreadoAtBefore(eq(EstadoPedido.PENDIENTE_PAGO), any()))
            .thenReturn(List.of(pedido(1L), pedido(2L)));

        job.cancelarPendientes();

        verify(pedidoService).cambiarEstado(1L, EstadoPedido.CANCELADO_POR_CLIENTE);
        verify(pedidoService).cambiarEstado(2L, EstadoPedido.CANCELADO_POR_CLIENTE);
    }

    @Test
    @DisplayName("busca pendientes de pago con un corte de tiempo en el pasado")
    void buscaConCorteEnElPasado() {
        when(pedidoRepository.findByEstadoAndCreadoAtBefore(eq(EstadoPedido.PENDIENTE_PAGO), any()))
            .thenReturn(List.of());

        job.cancelarPendientes();

        ArgumentCaptor<Instant> corte = ArgumentCaptor.forClass(Instant.class);
        verify(pedidoRepository).findByEstadoAndCreadoAtBefore(eq(EstadoPedido.PENDIENTE_PAGO), corte.capture());
        assertThat(corte.getValue()).isBefore(Instant.now());
    }

    private Pedido pedido(Long id) {
        Pedido pedido = Pedido.builder().codigo("QL-" + id).estado(EstadoPedido.PENDIENTE_PAGO).build();
        pedido.setId(id);
        return pedido;
    }
}
