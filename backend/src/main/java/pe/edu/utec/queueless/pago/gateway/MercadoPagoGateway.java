package pe.edu.utec.queueless.pago.gateway;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.pago.entity.Pago;

/**
 * Pasarela MercadoPago real (sandbox o prod según configuración).
 *
 * <p>TODO Semana 2: integrar SDK oficial de MercadoPago e implementar.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "queueless.pago.gateway", havingValue = "mercadopago")
public class MercadoPagoGateway implements PaymentGateway {

    @Override
    public String iniciarCobro(Pago pago) {
        // TODO: usar SDK MercadoPago — crear preference, devolver init_point
        throw new UnsupportedOperationException("MercadoPagoGateway pendiente — Semana 2");
    }

    @Override
    public void reembolsar(Pago pago) {
        // TODO
        throw new UnsupportedOperationException("MercadoPagoGateway pendiente — Semana 2");
    }
}
