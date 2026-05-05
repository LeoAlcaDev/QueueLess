package pe.edu.utec.queueless.shared.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Object id) {
        super("%s con id %s no existe".formatted(resource, id));
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
