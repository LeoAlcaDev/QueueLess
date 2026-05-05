package pe.edu.utec.queueless.pago.gateway;

import pe.edu.utec.queueless.pago.entity.Pago;

/**
 * Adaptador hacia una pasarela de pagos externa (MercadoPago, Culqi, etc.).
 * Implementaciones se seleccionan vía property {@code queueless.pago.gateway}.
 */
public interface PaymentGateway {

    /**
     * Inicia el cobro y devuelve la URL/referencia que el cliente debe usar
     * para completar el pago (redirect o token).
     */
    String iniciarCobro(Pago pago);

    /**
     * Emite un reembolso por el monto total del pago.
     */
    void reembolsar(Pago pago);
}
