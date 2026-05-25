package pe.edu.utec.queueless.pago.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercadopago.resources.payment.Payment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pago.gateway.MercadoPagoGateway;
import pe.edu.utec.queueless.pago.gateway.MercadoPagoSignatureValidator;
import pe.edu.utec.queueless.pago.service.PagoService;

/**
 * Webhook de MercadoPago. Solo se registra cuando {@code queueless.pago.gateway = mercadopago}
 * para no exigir el SDK ni el secreto en perfiles que no lo usan.
 *
 * <p>El handler:
 * <ol>
 *   <li>Valida la firma HMAC (x-signature + x-request-id).</li>
 *   <li>Extrae {@code data.id} (payment id) del payload.</li>
 *   <li>Consulta el Payment en la API para obtener {@code external_reference}
 *       (que es el id del Pago local).</li>
 *   <li>Llama a {@link PagoService#confirmarPorId} pasando el payment id
 *       como nueva referencia externa (para reembolsos posteriores).</li>
 * </ol>
 */
@Slf4j
@RestController
@RequestMapping("/api/pago/webhook")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "queueless.pago.gateway", havingValue = "mercadopago")
public class WebhookController {

    private final PagoService pagoService;
    private final MercadoPagoGateway mercadoPagoGateway;
    private final MercadoPagoSignatureValidator signatureValidator;
    private final ObjectMapper objectMapper;

    @PostMapping("/mercadopago")
    public ResponseEntity<Void> mercadoPagoCallback(
            @RequestBody String body,
            @RequestHeader(value = "x-signature", required = false) String firma,
            @RequestHeader(value = "x-request-id", required = false) String requestId) {
        log.info("Webhook MercadoPago recibido (signature presente: {})", firma != null);

        String dataId = extractDataId(body);
        if (dataId == null) {
            log.warn("Webhook MP sin data.id; descartado");
            return ResponseEntity.badRequest().build();
        }
        if (!signatureValidator.isValid(firma, requestId, dataId)) {
            log.warn("Webhook MP con firma inválida; rechazado");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Payment payment = mercadoPagoGateway.consultarPago(dataId);
        if (!"approved".equalsIgnoreCase(payment.getStatus())) {
            log.info("Payment {} en estado {}; no se confirma todavía", dataId, payment.getStatus());
            return ResponseEntity.ok().build();
        }

        String extRef = payment.getExternalReference();
        if (extRef == null || extRef.isBlank()) {
            log.warn("Webhook MP: payment {} sin external_reference; descartado", dataId);
            return ResponseEntity.ok().build();
        }
        long pagoId;
        try {
            pagoId = Long.parseLong(extRef);
        } catch (NumberFormatException ex) {
            log.warn("Webhook MP: external_reference '{}' no es numérico; descartado", extRef);
            return ResponseEntity.ok().build();
        }
        pagoService.confirmarPorId(pagoId, dataId);
        return ResponseEntity.ok().build();
    }

    private String extractDataId(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            JsonNode dataId = node.path("data").path("id");
            return dataId.isMissingNode() || dataId.isNull() ? null : dataId.asText();
        } catch (Exception ex) {
            log.warn("No se pudo parsear el payload del webhook MP", ex);
            return null;
        }
    }
}
