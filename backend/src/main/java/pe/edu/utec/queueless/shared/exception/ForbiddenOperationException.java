package pe.edu.utec.queueless.shared.exception;

/**
 * El usuario está autenticado pero no tiene permiso para esta operación (por ejemplo,
 * actuar con un rol que no posee). El handler global la mapea a 403 Forbidden.
 */
public class ForbiddenOperationException extends BusinessRuleException {
    public ForbiddenOperationException(String message) {
        super(message);
    }
}
