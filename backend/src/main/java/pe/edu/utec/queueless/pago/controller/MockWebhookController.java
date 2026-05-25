package pe.edu.utec.queueless.pago.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pago.dto.PagoResponse;
import pe.edu.utec.queueless.pago.service.PagoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;

/**
 * Endpoint auxiliar para simular el callback de la pasarela cuando el
 * gateway activo es el mock. Solo se registra cuando
 * {@code queueless.pago.gateway = mock}, que cubre los perfiles {@code dev} y
 * {@code test}; no está disponible en {@code prod}.
 */
@Slf4j
@RestController
@RequestMapping("/api/pago/webhook")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "queueless.pago.gateway", havingValue = "mock", matchIfMissing = true)
public class MockWebhookController {

    private final PagoService pagoService;

    @PostMapping("/mock")
    public ResponseEntity<ApiResponse<PagoResponse>> simularConfirmacion(
            @RequestParam("referencia") String referencia) {
        log.info("[MOCK] Confirmación recibida para referencia {}", referencia);
        PagoResponse response = PagoResponse.from(pagoService.confirmar(referencia));
        return ResponseEntity.ok(ApiResponse.ok(response, "Pago confirmado (mock)"));
    }
}
