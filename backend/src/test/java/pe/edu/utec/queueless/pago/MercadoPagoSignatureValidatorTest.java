package pe.edu.utec.queueless.pago;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.edu.utec.queueless.pago.gateway.MercadoPagoSignatureValidator;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifica la validación de firma del webhook de MercadoPago.
 * El cálculo de HMAC-SHA256 lo replicamos en el test para construir una
 * firma válida y otra inválida.
 */
class MercadoPagoSignatureValidatorTest {

    private static final String SECRET = "test-secret-xyz";

    private static String hmacHex(String message, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("firma válida con secret correcto: pasa")
    void firmaValidaPasa() throws Exception {
        MercadoPagoSignatureValidator validator = new MercadoPagoSignatureValidator(SECRET);
        String ts = "1700000000";
        String requestId = "req-123";
        String dataId = "987654321";
        String hash = hmacHex(
            "id:%s;request-id:%s;ts:%s;".formatted(dataId, requestId, ts),
            SECRET);
        String header = "ts=" + ts + ",v1=" + hash;

        assertThat(validator.isValid(header, requestId, dataId)).isTrue();
    }

    @Test
    @DisplayName("firma con hash incorrecto: rechazada")
    void firmaInvalidaRechazada() {
        MercadoPagoSignatureValidator validator = new MercadoPagoSignatureValidator(SECRET);
        String header = "ts=1700000000,v1=" + "0".repeat(64);

        assertThat(validator.isValid(header, "req-123", "987654321")).isFalse();
    }

    @Test
    @DisplayName("header malformado (sin v1) es rechazado")
    void headerSinHashRechazado() {
        MercadoPagoSignatureValidator validator = new MercadoPagoSignatureValidator(SECRET);

        assertThat(validator.isValid("ts=1700000000", "req-123", "987654321")).isFalse();
    }

    @Test
    @DisplayName("sin secret configurado, la validación pasa (dev local)")
    void sinSecretValidacionRelajada() {
        MercadoPagoSignatureValidator validator = new MercadoPagoSignatureValidator("");

        assertThat(validator.isValid(null, null, "987654321")).isTrue();
    }
}
