package pe.edu.utec.queueless.pago.gateway;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.pago.entity.Pago;

import java.util.UUID;

/**
 * Pasarela "mock" para desarrollo y tests: no llama a ningún servicio externo
 * y devuelve referencias deterministas locales. La confirmación se simula
 * con el endpoint {@code POST /api/pago/webhook/mock} expuesto cuando este
 * gateway está activo.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "queueless.pago.gateway", havingValue = "mock", matchIfMissing = true)
public class MockPaymentGateway implements PaymentGateway {

    @Override
    public IniciarCobroResult iniciarCobro(Pago pago) {
        String ref = "mock-" + UUID.randomUUID();
        String url = "/api/pago/webhook/mock?referencia=" + ref;
        log.info("[MOCK] Cobro iniciado para pago {} (monto {}). Referencia: {} URL: {}",
            pago.getId(), pago.getMonto(), ref, url);
        return new IniciarCobroResult(ref, url);
    }

    @Override
    public void reembolsar(Pago pago) {
        log.info("[MOCK] Reembolso emitido para pago {} (monto {})",
            pago.getId(), pago.getMonto());
    }
}
