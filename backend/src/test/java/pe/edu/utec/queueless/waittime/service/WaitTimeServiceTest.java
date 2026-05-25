package pe.edu.utec.queueless.waittime.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.waittime.strategy.ManualDeclaredStrategy;
import pe.edu.utec.queueless.waittime.strategy.PredictiveStrategy;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Selección de estrategia según el volumen de pedidos entregados del local. Sin Spring.
 */
@ExtendWith(MockitoExtension.class)
class WaitTimeServiceTest {

    @Mock private ManualDeclaredStrategy manual;
    @Mock private PredictiveStrategy predictive;
    @Mock private PuntoDeVentaRepository puntoDeVentaRepository;
    @Mock private PedidoRepository pedidoRepository;

    @InjectMocks private WaitTimeService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "umbralFase2", 50);
    }

    @Test
    @DisplayName("un local inexistente o inactivo da 404")
    void localInexistente() {
        when(puntoDeVentaRepository.findByIdAndActivoTrue(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.estimarMinutos(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("con menos pedidos entregados que el umbral, usa la estrategia manual")
    void pocosEntregadosUsaManual() {
        PuntoDeVenta local = local(1L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(local));
        when(pedidoRepository.countByPuntoDeVentaIdAndEstado(1L, EstadoPedido.EN_PREPARACION)).thenReturn(2);
        when(pedidoRepository.countByPuntoDeVentaIdAndEstado(1L, EstadoPedido.ENTREGADO)).thenReturn(10);
        when(manual.estimarMinutos(local, 2)).thenReturn(16);

        assertThat(service.estimarMinutos(1L)).isEqualTo(16);
        verify(manual).estimarMinutos(local, 2);
        verify(predictive, never()).estimarMinutos(any(), anyInt());
    }

    @Test
    @DisplayName("con pedidos entregados suficientes, usa la estrategia predictiva")
    void muchosEntregadosUsaPredictiva() {
        PuntoDeVenta local = local(1L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(1L)).thenReturn(Optional.of(local));
        when(pedidoRepository.countByPuntoDeVentaIdAndEstado(1L, EstadoPedido.EN_PREPARACION)).thenReturn(2);
        when(pedidoRepository.countByPuntoDeVentaIdAndEstado(1L, EstadoPedido.ENTREGADO)).thenReturn(50);
        when(predictive.estimarMinutos(local, 2)).thenReturn(25);

        assertThat(service.estimarMinutos(1L)).isEqualTo(25);
        verify(predictive).estimarMinutos(local, 2);
        verify(manual, never()).estimarMinutos(any(), anyInt());
    }

    private PuntoDeVenta local(Long id) {
        PuntoDeVenta local = PuntoDeVenta.builder().tiempoPromedioDeclarado(10).build();
        local.setId(id);
        return local;
    }
}
