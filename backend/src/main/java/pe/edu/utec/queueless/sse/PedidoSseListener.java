package pe.edu.utec.queueless.sse;

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
import pe.edu.utec.queueless.sse.dto.CambioEstadoSse;

import java.time.Instant;

/**
 * Segundo consumidor del cambio de estado del pedido (el primero es el push):
 * reparte el evento por SSE al cliente dueño del pedido y al comercio del local.
 *
 * <p>Sigue el mismo patrón que el listener de push y el de correo (ADR-0009):
 * corre después del commit y en otro hilo (@Async), y vuelve a leer el pedido en
 * una transacción read-only propia porque el evento solo trae el id y acá
 * necesitamos el cliente y el punto de venta, que son lazy. Es un canal
 * complementario al push, best-effort: si algo falla, queda en un WARN y el
 * cambio del pedido no se ve afectado (ADR-0024).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PedidoSseListener {

    private final RegistroSse registro;
    private final PedidoService pedidoService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onCambioEstado(PedidoEstadoCambiadoEvent event) {
        // Estar en la pantalla de pago no es novedad para la UI; igual que el push,
        // no emitimos el PENDIENTE_PAGO inicial.
        if (event.getEstadoNuevo() == EstadoPedido.PENDIENTE_PAGO) {
            return;
        }
        try {
            Pedido pedido = pedidoService.findById(event.getPedidoId());
            CambioEstadoSse payload = CambioEstadoSse.builder()
                .pedidoId(pedido.getId())
                .estadoAnterior(event.getEstadoAnterior())
                .estadoNuevo(event.getEstadoNuevo())
                .puntoDeVentaId(pedido.getPuntoDeVenta().getId())
                .ocurridoAt(Instant.now())
                .build();

            // Resolvemos los dueños desde el pedido y le mandamos el evento solo a
            // ellos: al cliente del pedido y al comercio (gestor) del local.
            Long clienteId = pedido.getCliente().getId();
            Long comercioId = pedido.getPuntoDeVenta().getGestor().getId();
            registro.enviarACliente(clienteId, payload);
            registro.enviarAComercio(comercioId, payload);
        } catch (Exception ex) {
            log.warn("No se pudo repartir por SSE el cambio del pedido {}: {}",
                event.getPedidoId(), ex.getMessage());
        }
    }
}
