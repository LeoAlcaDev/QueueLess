package pe.edu.utec.queueless.pago.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pago.dto.IniciarPagoResponse;
import pe.edu.utec.queueless.pago.entity.EstadoPago;
import pe.edu.utec.queueless.pago.entity.Pago;
import pe.edu.utec.queueless.pago.gateway.IniciarCobroResult;
import pe.edu.utec.queueless.pago.gateway.PaymentGateway;
import pe.edu.utec.queueless.pago.repository.PagoRepository;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.DuplicateResourceException;
import pe.edu.utec.queueless.shared.exception.PaymentException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;

import java.time.Instant;

/**
 * Orquesta el ciclo de vida del Pago: iniciar contra la pasarela, confirmar
 * desde el webhook y reembolsar.
 *
 * <p>La transición del pedido tras confirmar se delega en
 * {@link PedidoService#cambiarEstado} para que se publique el evento de
 * dominio (y los listeners de notificación/queuepoints reaccionen).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PagoService {

    private final PagoRepository pagoRepository;
    private final PedidoService pedidoService;
    private final PaymentGateway paymentGateway;

    /**
     * Crea el Pago en PENDIENTE, dispara el cobro contra la pasarela y
     * persiste la referencia externa devuelta.
     *
     * @param clienteId el cliente autenticado: el pedido debe pertenecerle.
     */
    public IniciarPagoResponse iniciar(Long pedidoId, Long clienteId) {
        Pedido pedido = pedidoService.findById(pedidoId);

        if (!pedido.getCliente().getId().equals(clienteId)) {
            throw new ResourceNotFoundException("Pedido", pedidoId);
        }
        if (pedido.getEstado() != EstadoPedido.PENDIENTE_PAGO) {
            throw new BusinessRuleException(
                "Solo se puede iniciar el pago de un pedido en PENDIENTE_PAGO");
        }
        if (pagoRepository.existsByPedidoId(pedidoId)) {
            throw new DuplicateResourceException("El pedido ya tiene un pago iniciado");
        }

        Pago pago = Pago.builder()
            .pedido(pedido)
            .monto(pedido.getTotal())
            .metodo(metodoActual())
            .estado(EstadoPago.PENDIENTE)
            .build();
        pago = pagoRepository.save(pago);

        IniciarCobroResult resultado = paymentGateway.iniciarCobro(pago);
        pago.setReferenciaExterna(resultado.referenciaExterna());
        pago = pagoRepository.save(pago);

        log.info("Pago {} iniciado para pedido {} (ref {})",
            pago.getId(), pedidoId, pago.getReferenciaExterna());

        return IniciarPagoResponse.builder()
            .pagoId(pago.getId())
            .pedidoId(pedidoId)
            .monto(pago.getMonto())
            .estado(pago.getEstado())
            .referenciaExterna(pago.getReferenciaExterna())
            .urlCheckout(resultado.urlCheckout())
            .build();
    }

    /**
     * Marca el pago como CONFIRMADO y transiciona el pedido al siguiente
     * estado según su tipo de entrega. Idempotente: si ya estaba confirmado,
     * no hace nada (los webhooks pueden reentregar).
     */
    public Pago confirmar(String referenciaExterna) {
        Pago pago = pagoRepository.findByReferenciaExterna(referenciaExterna)
            .orElseThrow(() -> new ResourceNotFoundException("Pago[ref=" + referenciaExterna + "]"));
        return confirmarInterno(pago, referenciaExterna);
    }

    /**
     * Variante usada cuando ya resolvimos el pago por id (típicamente desde el
     * webhook de MercadoPago, que entrega el payment id y lo resolvemos vía
     * external_reference). Permite además registrar el payment id externo
     * para que el reembolso posterior pueda usarlo.
     */
    public Pago confirmarPorId(Long pagoId, String nuevaReferenciaExterna) {
        Pago pago = pagoRepository.findById(pagoId)
            .orElseThrow(() -> new ResourceNotFoundException("Pago", pagoId));
        return confirmarInterno(pago, nuevaReferenciaExterna);
    }

    private Pago confirmarInterno(Pago pago, String nuevaReferenciaExterna) {
        if (pago.getEstado() == EstadoPago.CONFIRMADO) {
            log.info("Pago {} ya estaba CONFIRMADO, ignorando reentrega del webhook", pago.getId());
            return pago;
        }
        if (pago.getEstado() != EstadoPago.PENDIENTE) {
            throw new PaymentException(
                "No se puede confirmar un pago en estado " + pago.getEstado());
        }

        pago.setEstado(EstadoPago.CONFIRMADO);
        pago.setConfirmadoAt(Instant.now());
        if (nuevaReferenciaExterna != null) {
            pago.setReferenciaExterna(nuevaReferenciaExterna);
        }
        pago = pagoRepository.save(pago);

        EstadoPedido siguiente = siguienteEstadoTrasPago(pago.getPedido().getTipoEntrega());
        pedidoService.cambiarEstado(pago.getPedido().getId(), siguiente);
        log.info("Pago {} confirmado y pedido {} transicionado a {}",
            pago.getId(), pago.getPedido().getId(), siguiente);
        return pago;
    }

    @Transactional(readOnly = true)
    public Pago findById(Long id) {
        return pagoRepository.findByIdWithPedido(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pago", id));
    }

    private static EstadoPedido siguienteEstadoTrasPago(TipoEntrega tipoEntrega) {
        return tipoEntrega == TipoEntrega.DELIVERY
            ? EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR
            : EstadoPedido.PAGADO_ESPERANDO_COMERCIO;
    }

    private String metodoActual() {
        return paymentGateway.getMetodoPago();
    }
}
