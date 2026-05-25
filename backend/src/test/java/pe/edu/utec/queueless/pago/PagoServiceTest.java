package pe.edu.utec.queueless.pago;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.pago.dto.IniciarPagoResponse;
import pe.edu.utec.queueless.pago.entity.EstadoPago;
import pe.edu.utec.queueless.pago.entity.Pago;
import pe.edu.utec.queueless.pago.gateway.IniciarCobroResult;
import pe.edu.utec.queueless.pago.gateway.PaymentGateway;
import pe.edu.utec.queueless.pago.repository.PagoRepository;
import pe.edu.utec.queueless.pago.service.PagoService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas del PagoService aisladas: gateway, repo y pedidoService mockeados.
 */
@ExtendWith(MockitoExtension.class)
class PagoServiceTest {

    @Mock private PagoRepository pagoRepository;
    @Mock private PedidoService pedidoService;
    @Mock private PaymentGateway paymentGateway;

    @InjectMocks private PagoService pagoService;

    private Pedido pedido;

    @BeforeEach
    void setUp() {
        Usuario cliente = Usuario.builder().email("c@utec.edu.pe").build();
        cliente.setId(7L);

        pedido = Pedido.builder()
            .codigo("ABC-001")
            .cliente(cliente)
            .estado(EstadoPedido.PENDIENTE_PAGO)
            .tipoEntrega(TipoEntrega.PICKUP)
            .total(new BigDecimal("25.00"))
            .build();
        pedido.setId(42L);
    }

    @Test
    @DisplayName("iniciar: crea Pago PENDIENTE, llama gateway y persiste referencia externa")
    void iniciarFelizCamino() {
        when(pedidoService.findById(42L)).thenReturn(pedido);
        when(pagoRepository.existsByPedidoId(42L)).thenReturn(false);
        when(pagoRepository.save(any(Pago.class))).thenAnswer(i -> {
            Pago p = i.getArgument(0);
            if (p.getId() == null) p.setId(100L);
            return p;
        });
        when(paymentGateway.getMetodoPago()).thenReturn("MOCK");
        when(paymentGateway.iniciarCobro(any(Pago.class)))
            .thenReturn(new IniciarCobroResult("mock-ref-123", "http://checkout/x"));

        IniciarPagoResponse response = pagoService.iniciar(42L, 7L);

        assertThat(response.getPagoId()).isEqualTo(100L);
        assertThat(response.getEstado()).isEqualTo(EstadoPago.PENDIENTE);
        assertThat(response.getReferenciaExterna()).isEqualTo("mock-ref-123");
        assertThat(response.getUrlCheckout()).isEqualTo("http://checkout/x");

        ArgumentCaptor<Pago> captor = ArgumentCaptor.forClass(Pago.class);
        verify(pagoRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        Pago persistido = captor.getAllValues().get(1);
        assertThat(persistido.getReferenciaExterna()).isEqualTo("mock-ref-123");
        assertThat(persistido.getEstado()).isEqualTo(EstadoPago.PENDIENTE);
    }

    @Test
    @DisplayName("iniciar pago de pedido ajeno responde como no encontrado (404)")
    void iniciarPedidoAjenoFalla() {
        when(pedidoService.findById(42L)).thenReturn(pedido);

        assertThatThrownBy(() -> pagoService.iniciar(42L, 99L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("no existe");
        verify(paymentGateway, never()).iniciarCobro(any());
    }

    @Test
    @DisplayName("iniciar sobre pedido fuera de PENDIENTE_PAGO falla")
    void iniciarPedidoYaPagadoFalla() {
        pedido.setEstado(EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        when(pedidoService.findById(42L)).thenReturn(pedido);

        assertThatThrownBy(() -> pagoService.iniciar(42L, 7L))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("PENDIENTE_PAGO");
    }

    @Test
    @DisplayName("confirmar pago PICKUP: marca CONFIRMADO y transiciona a PAGADO_ESPERANDO_COMERCIO")
    void confirmarPickupTransicionaEsperandoComercio() {
        Pago pago = pagoBase();
        when(pagoRepository.findByReferenciaExterna("ref-1")).thenReturn(Optional.of(pago));
        when(pagoRepository.save(any(Pago.class))).thenAnswer(i -> i.getArgument(0));

        pagoService.confirmar("ref-1");

        assertThat(pago.getEstado()).isEqualTo(EstadoPago.CONFIRMADO);
        assertThat(pago.getConfirmadoAt()).isNotNull();
        verify(pedidoService).cambiarEstado(42L, EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
    }

    @Test
    @DisplayName("confirmar pago DELIVERY: transiciona a PAGADO_BUSCANDO_REPARTIDOR")
    void confirmarDeliveryTransicionaBuscandoRepartidor() {
        pedido.setTipoEntrega(TipoEntrega.DELIVERY);
        Pago pago = pagoBase();
        when(pagoRepository.findByReferenciaExterna("ref-2")).thenReturn(Optional.of(pago));
        when(pagoRepository.save(any(Pago.class))).thenAnswer(i -> i.getArgument(0));

        pagoService.confirmar("ref-2");

        verify(pedidoService).cambiarEstado(eq(42L), eq(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR));
    }

    @Test
    @DisplayName("confirmar dos veces es idempotente (no re-transiciona el pedido)")
    void confirmarEsIdempotente() {
        Pago pago = pagoBase();
        pago.setEstado(EstadoPago.CONFIRMADO);
        when(pagoRepository.findByReferenciaExterna("ref-3")).thenReturn(Optional.of(pago));

        pagoService.confirmar("ref-3");

        verify(pedidoService, never()).cambiarEstado(any(), any());
        verify(pagoRepository, never()).save(any());
    }

    private Pago pagoBase() {
        Pago pago = Pago.builder()
            .pedido(pedido)
            .monto(new BigDecimal("25.00"))
            .metodo("MOCK")
            .estado(EstadoPago.PENDIENTE)
            .referenciaExterna("ref-1")
            .build();
        pago.setId(100L);
        return pago;
    }
}
