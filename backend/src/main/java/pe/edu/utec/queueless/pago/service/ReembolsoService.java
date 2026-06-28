package pe.edu.utec.queueless.pago.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.utec.queueless.pago.entity.EstadoPago;
import pe.edu.utec.queueless.pago.entity.Pago;
import pe.edu.utec.queueless.pago.gateway.PaymentGateway;
import pe.edu.utec.queueless.pago.repository.PagoRepository;

import java.time.Instant;
import java.util.Optional;

/**
 * Servicio dedicado al reembolso. Lo separamos de {@link PagoService} porque lo
 * dispara un listener asíncrono (no el flujo del cliente) y conviene tener los logs
 * y la unidad de trabajo claros.
 *
 * <p>La llamada a la pasarela es I/O externa y se hace <b>fuera</b> de toda
 * transacción de base de datos: solo se abre una transacción corta para persistir el
 * resultado, de modo que la conexión no queda tomada durante la red.
 */
@Slf4j
@Service
public class ReembolsoService {

    private final PagoRepository pagoRepository;
    private final PaymentGateway paymentGateway;
    private final TransactionTemplate transactionTemplate;

    public ReembolsoService(PagoRepository pagoRepository, PaymentGateway paymentGateway,
                            PlatformTransactionManager transactionManager) {
        this.pagoRepository = pagoRepository;
        this.paymentGateway = paymentGateway;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Busca el pago confirmado del pedido, llama a la pasarela y marca el pago como
     * REEMBOLSADO. Idempotente: si no hay pago o ya está reembolsado, loguea y termina
     * sin error. Si la pasarela falla, el pago queda CONFIRMADO (no REEMBOLSADO) y el
     * error se loguea y se propaga, así el reembolso puede reintentarse.
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

        try {
            paymentGateway.reembolsar(pago);
        } catch (RuntimeException e) {
            log.error("Falló el reembolso del pago {} en la pasarela (pedido {}); queda CONFIRMADO para reintentar",
                pago.getId(), pedidoId, e);
            throw e;
        }

        transactionTemplate.executeWithoutResult(status -> {
            pago.setEstado(EstadoPago.REEMBOLSADO);
            pago.setReembolsadoAt(Instant.now());
            pagoRepository.save(pago);
        });
        log.info("Pago {} reembolsado correctamente (pedido {})", pago.getId(), pedidoId);
    }
}
