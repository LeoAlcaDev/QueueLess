package pe.edu.utec.queueless.notification.email;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
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
 * <p>{@code @Transactional(readOnly = true)} abre una sesión Hibernate propia
 * para que el render del recibo pueda navegar los items y el cliente del
 * pedido (lazy por default) sin tirar {@code LazyInitializationException}.
 */
@Component
@RequiredArgsConstructor
public class PedidoEntregadoEmailListener {

    private final EmailService emailService;
    private final PedidoService pedidoService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    @Transactional(readOnly = true)
    public void onPedidoEntregado(PedidoEstadoCambiadoEvent event) {
        if (event.getEstadoNuevo() != EstadoPedido.ENTREGADO) {
            return;
        }
        Pedido pedido = pedidoService.findById(event.getPedidoId());
        emailService.sendRecibo(pedido);
    }
}
