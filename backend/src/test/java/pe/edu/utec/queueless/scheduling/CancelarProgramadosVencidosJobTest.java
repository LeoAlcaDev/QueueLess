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
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;
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
 * La red de seguridad de los pedidos programados. Cierra los dos huecos: el comercio
 * que nunca aceptó y el que aceptó y abandonó. Colaboradores mockeados.
 */
@ExtendWith(MockitoExtension.class)
class CancelarProgramadosVencidosJobTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PedidoService pedidoService;

    @InjectMocks private CancelarProgramadosVencidosJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "graciaRecojoVencidoMinutos", 15);
    }

    @Test
    @DisplayName("un programado vencido que el comercio nunca aceptó se cancela como COMERCIO_NO_ATENDIO")
    void cancelaNoAtendido() {
        when(pedidoRepository.findByEstadoAndRecojoProgramadoAtBefore(
            eq(EstadoPedido.PAGADO_ESPERANDO_COMERCIO), any())).thenReturn(List.of(pedido(7L)));
        when(pedidoRepository.findByEstadoAndRecojoProgramadoAtBefore(
            eq(EstadoPedido.ACEPTADO), any())).thenReturn(List.of());

        job.cancelarVencidos();

        verify(pedidoService).cancelarProgramadoVencido(7L, MotivoCancelacion.COMERCIO_NO_ATENDIO);
    }

    @Test
    @DisplayName("un programado vencido que el comercio aceptó pero abandonó se cancela como COMERCIO_NO_PREPARO")
    void cancelaAbandonado() {
        when(pedidoRepository.findByEstadoAndRecojoProgramadoAtBefore(
            eq(EstadoPedido.PAGADO_ESPERANDO_COMERCIO), any())).thenReturn(List.of());
        when(pedidoRepository.findByEstadoAndRecojoProgramadoAtBefore(
            eq(EstadoPedido.ACEPTADO), any())).thenReturn(List.of(pedido(9L)));

        job.cancelarVencidos();

        verify(pedidoService).cancelarProgramadoVencido(9L, MotivoCancelacion.COMERCIO_NO_PREPARO);
    }

    @Test
    @DisplayName("sin programados vencidos no cancela nada; EN_PREPARACION ni se consulta")
    void sinVencidosNoHaceNada() {
        when(pedidoRepository.findByEstadoAndRecojoProgramadoAtBefore(any(), any())).thenReturn(List.of());

        job.cancelarVencidos();

        verify(pedidoService, never()).cancelarProgramadoVencido(any(), any());
        // el job solo mira PAGADO_ESPERANDO_COMERCIO y ACEPTADO; EN_PREPARACION queda en paz
        verify(pedidoRepository, never()).findByEstadoAndRecojoProgramadoAtBefore(
            eq(EstadoPedido.EN_PREPARACION), any());
    }

    @Test
    @DisplayName("la búsqueda de aceptados abandonados aplica el margen de gracia: corte anterior al de los no atendidos")
    void aplicaGraciaAlBuscarAbandonados() {
        when(pedidoRepository.findByEstadoAndRecojoProgramadoAtBefore(any(), any())).thenReturn(List.of());

        job.cancelarVencidos();

        ArgumentCaptor<Instant> corteNoAtendidos = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> corteAbandonados = ArgumentCaptor.forClass(Instant.class);
        verify(pedidoRepository).findByEstadoAndRecojoProgramadoAtBefore(
            eq(EstadoPedido.PAGADO_ESPERANDO_COMERCIO), corteNoAtendidos.capture());
        verify(pedidoRepository).findByEstadoAndRecojoProgramadoAtBefore(
            eq(EstadoPedido.ACEPTADO), corteAbandonados.capture());
        // el corte de abandonados resta la gracia, así que es anterior al de no atendidos
        assertThat(corteAbandonados.getValue()).isBefore(corteNoAtendidos.getValue());
    }

    private Pedido pedido(Long id) {
        Pedido pedido = Pedido.builder().codigo("QL-" + id).estado(EstadoPedido.PAGADO_ESPERANDO_COMERCIO).build();
        pedido.setId(id);
        return pedido;
    }
}
