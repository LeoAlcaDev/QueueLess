package pe.edu.utec.queueless.pedido.event;

import lombok.AllArgsConstructor;
import lombok.Getter;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;

/**
 * Evento único que cubre cualquier cambio de estado del Pedido.
 *
 * <p>Los listeners filtran por {@code estadoNuevo} para reaccionar a
 * transiciones específicas (notificar push, gatillar reembolso, asignar puntos,
 * etc.). Esto reemplaza tener N eventos separados (PedidoCreado, PedidoAceptado,
 * PedidoListo, ...) y reduce el ruido de clases sin lógica.
 */
@Getter
@AllArgsConstructor
public class PedidoEstadoCambiadoEvent {
    private final Long pedidoId;
    private final EstadoPedido estadoAnterior;
    private final EstadoPedido estadoNuevo;
}
