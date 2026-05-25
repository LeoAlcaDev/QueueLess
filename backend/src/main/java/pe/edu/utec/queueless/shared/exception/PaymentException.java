package pe.edu.utec.queueless.shared.exception;

/**
 * Falla relacionada con el pago: estado inválido para confirmar o reembolsar, o un
 * error de la pasarela. El handler global la mapea a 422 Unprocessable Entity.
 */
public class PaymentException extends BusinessRuleException {
    public PaymentException(String message) {
        super(message);
    }
}
