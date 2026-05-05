package pe.edu.utec.queueless.pago.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints públicos donde la pasarela notifica el estado del pago.
 * Validación de firma debe hacerse adentro (HMAC con secret compartido).
 */
@Slf4j
@RestController
@RequestMapping("/api/pago/webhook")
@RequiredArgsConstructor
public class WebhookController {

    @PostMapping("/mercadopago")
    public ResponseEntity<Void> mercadoPagoCallback(@RequestBody String body,
                                                    @RequestHeader(value = "x-signature", required = false) String firma) {
        log.info("Webhook MercadoPago recibido (signature presente: {})", firma != null);
        // TODO Semana 2: validar firma, parsear payload, llamar pagoService.confirmar(referenciaExterna)
        return ResponseEntity.ok().build();
    }
}
