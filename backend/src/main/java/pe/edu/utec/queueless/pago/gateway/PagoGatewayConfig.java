package pe.edu.utec.queueless.pago.gateway;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Proporciona un bean PaymentGateway de falla explícita cuando el valor de
 * {@code queueless.pago.gateway} no coincide con ninguna implementación conocida
 * (mock, mercadopago). Sin esto, Spring fallaría con un UnsatisfiedDependencyException
 * genérico que no menciona la causa raíz.
 */
@Configuration
public class PagoGatewayConfig {

    @Bean
    @ConditionalOnMissingBean(PaymentGateway.class)
    PaymentGateway gatewayNoDisponible(
            @Value("${queueless.pago.gateway:}") String valorConfigurado) {
        throw new IllegalStateException(
            "Gateway de pago desconocido: '" + valorConfigurado + "'. " +
            "Valores válidos: mock, mercadopago. Revisá la variable PAGO_GATEWAY.");
    }
}
