package pe.edu.utec.queueless.shared.exception;

/**
 * El archivo subido no es válido (vacío o con una extensión no permitida).
 * El handler global la mapea a 422 Unprocessable Entity.
 */
public class InvalidFileException extends BusinessRuleException {
    public InvalidFileException(String message) {
        super(message);
    }
}
