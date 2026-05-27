package pe.edu.utec.queueless.notification.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.service.PedidoService;

/**
 * Manda el recibo al cliente cuando un pedido pasa a ENTREGADO. Corre fuera de
 * la transacción de la entrega (AFTER_COMMIT por default + @Async): si SMTP
 * falla, la transición a ENTREGADO igual quedó consolidada. Ver ADR-0021.
 *
 * <p>{@code @Transactional(propagation = REQUIRES_NEW, readOnly = true)} abre
 * una sesión Hibernate propia para que el render del recibo pueda navegar los
 * items y el cliente del pedido (lazy por default) sin tirar
 * {@code LazyInitializationException}. Spring exige REQUIRES_NEW (o
 * NOT_SUPPORTED) cuando se combina {@code @TransactionalEventListener} con
 * {@code @Transactional}: como el listener corre AFTER_COMMIT, no hay tx
 * activa a la que unirse con la propagación REQUIRED del default.
 *
 * <p>Cualquier excepción se atrapa y queda en WARN para no propagarse al
 * executor async (mantiene la observabilidad localizada y respeta best-effort).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PedidoEntregadoEmailListener {

    private final EmailService emailService;
    private final PedidoService pedidoService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onPedidoEntregado(PedidoEstadoCambiadoEvent event) {
        if (event.getEstadoNuevo() != EstadoPedido.ENTREGADO) {
            return;
        }
        try {
            Pedido pedido = pedidoService.findById(event.getPedidoId());
            emailService.sendRecibo(pedido);
        } catch (Exception ex) {
            log.warn("No se pudo enviar el recibo del pedido {}: {}",
                event.getPedidoId(), ex.getMessage());
        }
    }
}
