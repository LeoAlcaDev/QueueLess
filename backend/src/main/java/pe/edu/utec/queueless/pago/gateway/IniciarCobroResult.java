package pe.edu.utec.queueless.pago.gateway;

/**
 * Resultado de iniciar el cobro contra una pasarela.
 * Separa la referencia interna (para persistirla y resolver el webhook)
 * de la URL pública que el cliente debe abrir para completar el pago.
 */
public record IniciarCobroResult(String referenciaExterna, String urlCheckout) {
}
