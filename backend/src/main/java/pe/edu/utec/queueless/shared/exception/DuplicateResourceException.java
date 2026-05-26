package pe.edu.utec.queueless.shared.exception;

/**
 * Se intenta crear algo que ya existe (un correo registrado, una reseña repetida,
 * un rol ya activo, un pago ya iniciado). El handler global la mapea a 409 Conflict.
 */
public class DuplicateResourceException extends BusinessRuleException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
