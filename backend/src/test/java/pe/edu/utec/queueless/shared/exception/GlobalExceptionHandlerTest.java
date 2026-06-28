package pe.edu.utec.queueless.shared.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.bind.MissingServletRequestParameterException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mapeo de excepciones a codigos HTTP. Se invoca cada handler directamente, sin levantar
 * Spring. Patron AAA.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest();

    @Test
    @DisplayName("una violacion de integridad se mapea a 409 Conflict")
    void shouldResponder409WhenDataIntegrityViolation() {
        // Arrange
        DataIntegrityViolationException ex = new DataIntegrityViolationException("clave duplicada");

        // Act
        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrity(ex, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    @DisplayName("un parametro requerido ausente se mapea a 400 Bad Request")
    void shouldResponder400WhenMissingParameter() {
        // Arrange
        MissingServletRequestParameterException ex =
            new MissingServletRequestParameterException("id", "String");

        // Act
        ResponseEntity<ErrorResponse> response = handler.handleMissingParameter(ex, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
