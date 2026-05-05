package pe.edu.utec.queueless.shared.exception;

/**
 * Se lanza cuando una operación viola una regla de negocio
 * (ej. transición de estado inválida, intento de cancelar un pedido aceptado).
 */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
