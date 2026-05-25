package pe.edu.utec.queueless.shared.exception;

/**
 * Se intenta una transición de estado que la máquina de estados del pedido no permite.
 * El handler global la mapea a 422 Unprocessable Entity.
 */
public class InvalidStateTransitionException extends BusinessRuleException {
    public InvalidStateTransitionException(String message) {
        super(message);
    }
}
