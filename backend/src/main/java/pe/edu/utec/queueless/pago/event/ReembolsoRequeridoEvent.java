package pe.edu.utec.queueless.pago.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Pide reembolsar el pago de un pedido cuando el dinero ya se capturó pero el pedido
 * no puede recibirlo: hoy lo dispara un pago que se confirma sobre un pedido que ya
 * estaba terminal. El reembolso por cancelación tiene su propio camino (PagoListener
 * sobre PedidoEstadoCambiadoEvent); ambos terminan llamando al mismo emitirReembolso.
 */
@Getter
@AllArgsConstructor
public class ReembolsoRequeridoEvent {
    private final Long pedidoId;
}
