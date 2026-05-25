package pe.edu.utec.queueless.shared.exception;

/**
 * El usuario intenta canjear más QueuePoints de los que tiene de saldo.
 * El handler global la mapea a 422 Unprocessable Entity.
 */
public class InsufficientPointsException extends BusinessRuleException {
    public InsufficientPointsException(String message) {
        super(message);
    }
}
