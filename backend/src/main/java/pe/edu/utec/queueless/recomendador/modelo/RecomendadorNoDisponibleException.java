package pe.edu.utec.queueless.recomendador.modelo;

/**
 * Señala que el modelo de recomendación no está disponible: sin API key configurada (en
 * dev), o caído o con timeout. El asistente la atrapa y degrada a la lista segura (ADR-0031).
 */
public class RecomendadorNoDisponibleException extends RuntimeException {

    public RecomendadorNoDisponibleException(String mensaje) {
        super(mensaje);
    }

    public RecomendadorNoDisponibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
