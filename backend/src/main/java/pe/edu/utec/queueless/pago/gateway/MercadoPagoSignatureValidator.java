package pe.edu.utec.queueless.pago.gateway;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.NoSuchAlgorithmException;
import java.security.InvalidKeyException;
import java.util.HexFormat;

/**
 * Valida la firma de los webhooks de MercadoPago.
 *
 * <p>MercadoPago envía dos cabeceras relevantes:
 * <ul>
 *   <li>{@code x-signature}: contiene {@code ts=TIMESTAMP,v1=HASH}</li>
 *   <li>{@code x-request-id}: identificador único del request</li>
 * </ul>
 *
 * <p>El template firmado es:
 * {@code id:<data.id>;request-id:<x-request-id>;ts:<ts>;}
 * y el HMAC-SHA256 se calcula con el {@code webhook-secret} configurado en el
 * panel de integración.
 *
 * <p>Si no hay secreto configurado (dev local), la validación pasa siempre y
 * se loggea un warning. En producción el secreto es obligatorio.
 */
@Slf4j
@Component
public class MercadoPagoSignatureValidator {

    private final String secret;

    public MercadoPagoSignatureValidator(
            @Value("${queueless.pago.mercadopago.webhook-secret:}") String secret) {
        this.secret = secret;
    }

    public boolean isValid(String signatureHeader, String requestId, String dataId) {
        if (secret == null || secret.isBlank()) {
            log.warn("MP webhook-secret no configurado: la firma no se está validando");
            return true;
        }
        if (signatureHeader == null || dataId == null) {
            return false;
        }
        String ts = extractPart(signatureHeader, "ts");
        String v1 = extractPart(signatureHeader, "v1");
        if (ts == null || v1 == null) {
            return false;
        }
        String template = "id:%s;request-id:%s;ts:%s;".formatted(
            dataId, requestId == null ? "" : requestId, ts);
        String computed = hmacSha256(template, secret);
        return constantTimeEquals(computed, v1);
    }

    private static String extractPart(String header, String key) {
        for (String pair : header.split(",")) {
            String[] kv = pair.trim().split("=", 2);
            if (kv.length == 2 && kv[0].equals(key)) {
                return kv[1];
            }
        }
        return null;
    }

    private static String hmacSha256(String message, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException ex) {
            throw new IllegalStateException("No se pudo calcular HMAC-SHA256", ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
