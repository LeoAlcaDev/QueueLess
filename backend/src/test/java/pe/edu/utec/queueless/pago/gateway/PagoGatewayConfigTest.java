package pe.edu.utec.queueless.pago.gateway;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifica que el respaldo de configuración de la pasarela falla con un
 * mensaje accionable cuando el valor configurado no corresponde a ninguna
 * implementación conocida.
 */
class PagoGatewayConfigTest {

    @Test
    @DisplayName("gatewayNoDisponible: lanza IllegalStateException con mensaje accionable")
    void fallbackLanzaConMensajeAccionable() {
        PagoGatewayConfig config = new PagoGatewayConfig();

        assertThatThrownBy(() -> config.gatewayNoDisponible("culqi"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Gateway de pago desconocido")
            .hasMessageContaining("culqi")
            .hasMessageContaining("mock, mercadopago");
    }
}
