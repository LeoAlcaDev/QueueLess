package pe.edu.utec.queueless.pago;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.pago.entity.EstadoPago;
import pe.edu.utec.queueless.pago.entity.Pago;
import pe.edu.utec.queueless.pago.gateway.PaymentGateway;
import pe.edu.utec.queueless.pago.repository.PagoRepository;
import pe.edu.utec.queueless.pago.service.ReembolsoService;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReembolsoServiceTest {

    @Mock private PagoRepository pagoRepository;
    @Mock private PaymentGateway paymentGateway;

    @InjectMocks private ReembolsoService reembolsoService;

    @Test
    @DisplayName("emite reembolso, marca pago como REEMBOLSADO y persiste")
    void reembolsaCorrectamente() {
        Pago pago = Pago.builder()
            .monto(new BigDecimal("30.00"))
            .metodo("MOCK")
            .estado(EstadoPago.CONFIRMADO)
            .referenciaExterna("ref-1")
            .build();
        pago.setId(1L);
        when(pagoRepository.findByPedidoId(42L)).thenReturn(Optional.of(pago));
        when(pagoRepository.save(any(Pago.class))).thenAnswer(i -> i.getArgument(0));

        reembolsoService.emitirReembolso(42L);

        verify(paymentGateway).reembolsar(pago);
        assertThat(pago.getEstado()).isEqualTo(EstadoPago.REEMBOLSADO);
        assertThat(pago.getReembolsadoAt()).isNotNull();
    }

    @Test
    @DisplayName("si el pago ya está REEMBOLSADO, no se llama al gateway (idempotencia)")
    void noReembolsaDosVeces() {
        Pago pago = Pago.builder().estado(EstadoPago.REEMBOLSADO).build();
        pago.setId(1L);
        when(pagoRepository.findByPedidoId(42L)).thenReturn(Optional.of(pago));

        reembolsoService.emitirReembolso(42L);

        verify(paymentGateway, never()).reembolsar(any());
    }

    @Test
    @DisplayName("si no hay pago para el pedido, no falla y no llama al gateway")
    void pedidoSinPagoEsNoOp() {
        when(pagoRepository.findByPedidoId(42L)).thenReturn(Optional.empty());

        reembolsoService.emitirReembolso(42L);

        verify(paymentGateway, never()).reembolsar(any());
    }
}
