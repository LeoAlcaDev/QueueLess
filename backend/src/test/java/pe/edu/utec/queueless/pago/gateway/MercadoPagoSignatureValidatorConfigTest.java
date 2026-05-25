package pe.edu.utec.queueless.pago.gateway;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifica el bloqueo de arranque del validador de firma: en producción sin
 * secret debe cortar el arranque; en desarrollo sin secret debe dejar pasar.
 */
class MercadoPagoSignatureValidatorConfigTest {

    @Test
    @DisplayName("validarConfiguracion: en perfil dev sin secret, no lanza")
    void validacionPasaEnDevSinSecret() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"dev"});
        MercadoPagoSignatureValidator validator = new MercadoPagoSignatureValidator("", env);

        assertThatNoException().isThrownBy(validator::validarConfiguracion);
    }

    @Test
    @DisplayName("validarConfiguracion: en perfil prod sin secret, lanza IllegalStateException")
    void validacionFallaEnProdSinSecret() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"prod"});
        MercadoPagoSignatureValidator validator = new MercadoPagoSignatureValidator("", env);

        assertThatThrownBy(validator::validarConfiguracion)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("MERCADOPAGO_WEBHOOK_SECRET");
    }
}
