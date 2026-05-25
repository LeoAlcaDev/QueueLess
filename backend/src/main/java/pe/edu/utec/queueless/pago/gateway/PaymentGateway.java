package pe.edu.utec.queueless.pago.gateway;

import pe.edu.utec.queueless.pago.entity.Pago;

/**
 * Adaptador hacia una pasarela de pagos externa (MercadoPago, Culqi, mock).
 * Implementaciones se seleccionan vía property {@code queueless.pago.gateway}.
 */
public interface PaymentGateway {

    /**
     * Inicia el cobro contra la pasarela y devuelve la referencia externa
     * (a persistir para resolver webhooks) y la URL de checkout que el
     * cliente debe abrir para completar el pago.
     */
    IniciarCobroResult iniciarCobro(Pago pago);

    /**
     * Emite un reembolso por el monto total del pago.
     */
    void reembolsar(Pago pago);
}
