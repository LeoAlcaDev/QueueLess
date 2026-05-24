package pe.edu.utec.queueless.pedido.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Valida la regla cross-field del DTO: si el motivo es OTRO, el detalle es
 * obligatorio. Usa el Validator de Jakarta directamente, sin levantar Spring.
 */
class MotivoCancelacionRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private Set<ConstraintViolation<MotivoCancelacionRequest>> validar(MotivoCancelacion motivo, String detalle) {
        MotivoCancelacionRequest request = new MotivoCancelacionRequest();
        request.setMotivo(motivo);
        request.setDetalle(detalle);
        return validator.validate(request);
    }

    @Test
    @DisplayName("un motivo de la lista, sin detalle, es válido")
    void motivoSimpleSinDetalleEsValido() {
        assertThat(validar(MotivoCancelacion.PRODUCTO_AGOTADO, null)).isEmpty();
    }

    @Test
    @DisplayName("motivo OTRO sin detalle es inválido")
    void otroSinDetalleEsInvalido() {
        assertThat(validar(MotivoCancelacion.OTRO, null)).isNotEmpty();
    }

    @Test
    @DisplayName("motivo OTRO con detalle de menos de 10 caracteres es inválido")
    void otroConDetalleCortoEsInvalido() {
        assertThat(validar(MotivoCancelacion.OTRO, "corto")).isNotEmpty();
    }

    @Test
    @DisplayName("motivo OTRO con detalle suficiente es válido")
    void otroConDetalleSuficienteEsValido() {
        assertThat(validar(MotivoCancelacion.OTRO, "El cliente pidió cancelar por teléfono")).isEmpty();
    }

    @Test
    @DisplayName("el motivo es obligatorio")
    void motivoNuloEsInvalido() {
        assertThat(validar(null, null)).isNotEmpty();
    }
}
