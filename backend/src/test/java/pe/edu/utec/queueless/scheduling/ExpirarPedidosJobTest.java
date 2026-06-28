package pe.edu.utec.queueless.scheduling;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpirarPedidosJobTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PedidoService pedidoService;

    @InjectMocks private ExpirarPedidosJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "expiracionMinutos", 30);
    }

    @Test
    @DisplayName("delega cada candidato vencido al service, que lo relee con bloqueo antes de expirar")
    void delegaCadaCandidatoAlService() {
        when(pedidoRepository.findByEstadoAndListoAtBefore(eq(EstadoPedido.LISTO_PARA_RECOGER), any()))
            .thenReturn(List.of(pedido(1L), pedido(2L)));
        when(pedidoService.expirarRecojo(anyLong())).thenReturn(true);

        job.expirarPedidos();

        verify(pedidoService).expirarRecojo(1L);
        verify(pedidoService).expirarRecojo(2L);
    }

    @Test
    @DisplayName("una falla al expirar un pedido no aborta el resto del lote")
    void unaFallaNoAbortaElLote() {
        when(pedidoRepository.findByEstadoAndListoAtBefore(eq(EstadoPedido.LISTO_PARA_RECOGER), any()))
            .thenReturn(List.of(pedido(1L), pedido(2L)));
        when(pedidoService.expirarRecojo(1L)).thenThrow(new RuntimeException("falla puntual"));
        when(pedidoService.expirarRecojo(2L)).thenReturn(true);

        job.expirarPedidos();

        verify(pedidoService).expirarRecojo(2L);
    }

    private Pedido pedido(Long id) {
        Pedido pedido = Pedido.builder()
            .codigo("QL-" + id).estado(EstadoPedido.LISTO_PARA_RECOGER).build();
        pedido.setId(id);
        return pedido;
    }
}
