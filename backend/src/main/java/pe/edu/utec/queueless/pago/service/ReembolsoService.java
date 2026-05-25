package pe.edu.utec.queueless.pago.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pago.entity.EstadoPago;
import pe.edu.utec.queueless.pago.entity.Pago;
import pe.edu.utec.queueless.pago.gateway.PaymentGateway;
import pe.edu.utec.queueless.pago.repository.PagoRepository;

import java.time.Instant;
import java.util.Optional;

/**
 * Servicio dedicado al reembolso. Lo separamos de {@link PagoService} porque
 * lo dispara un listener asíncrono (no el flujo del cliente) y conviene tener
 * los logs y la unidad de trabajo claros.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ReembolsoService {

    private final PagoRepository pagoRepository;
    private final PaymentGateway paymentGateway;

    /**
     * Busca el pago confirmado del pedido, llama a la pasarela y marca el
     * pago como REEMBOLSADO. Idempotente: si no hay pago o ya está
     * reembolsado, loggea y termina sin error (el listener corre tras commit
     * y no podría rollbackear el cancelado).
     */
    public void emitirReembolso(Long pedidoId) {
        Optional<Pago> opt = pagoRepository.findByPedidoId(pedidoId);
        if (opt.isEmpty()) {
            log.warn("Reembolso solicitado para pedido {} sin pago asociado", pedidoId);
            return;
        }
        Pago pago = opt.get();
        if (pago.getEstado() == EstadoPago.REEMBOLSADO) {
            log.info("Pago {} ya estaba REEMBOLSADO, no se reemite", pago.getId());
            return;
        }
        if (pago.getEstado() != EstadoPago.CONFIRMADO) {
            log.warn("Pago {} en estado {} no es reembolsable; ignorando", pago.getId(), pago.getEstado());
            return;
        }

        paymentGateway.reembolsar(pago);
        pago.setEstado(EstadoPago.REEMBOLSADO);
        pago.setReembolsadoAt(Instant.now());
        pagoRepository.save(pago);
        log.info("Pago {} reembolsado correctamente (pedido {})", pago.getId(), pedidoId);
    }
}
