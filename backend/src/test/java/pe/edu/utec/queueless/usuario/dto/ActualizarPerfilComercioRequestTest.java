package pe.edu.utec.queueless.usuario.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifica la regla del RUC peruano (11 digitos, empieza con 10 o 20) declarada con
 * @Pattern en el DTO. Usa el Validator de Jakarta directamente, sin levantar Spring.
 */
class ActualizarPerfilComercioRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private Set<ConstraintViolation<ActualizarPerfilComercioRequest>> validarConRuc(String ruc) {
        ActualizarPerfilComercioRequest request = new ActualizarPerfilComercioRequest();
        request.setRuc(ruc);
        return validator.validate(request);
    }

    @ParameterizedTest
    @ValueSource(strings = {"20512345678", "10123456789"})
    @DisplayName("RUC valido (11 digitos, empieza con 10 o 20) no genera violaciones")
    void rucValido(String ruc) {
        assertThat(validarConRuc(ruc)).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"30512345678", "2051234567", "205123456789", "2051234567a", "abcdefghijk"})
    @DisplayName("RUC con formato invalido genera al menos una violacion")
    void rucInvalido(String ruc) {
        assertThat(validarConRuc(ruc)).isNotEmpty();
    }

    @Test
    @DisplayName("RUC en blanco es rechazado")
    void rucEnBlanco() {
        assertThat(validarConRuc("   ")).isNotEmpty();
    }
}
