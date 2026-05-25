package pe.edu.utec.queueless.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * El validador del secret de JWT corta el arranque en producción cuando el secret es
 * inseguro, y solo avisa en otros perfiles. Los cuatro casos del ADR de hardening.
 */
class JwtSecretValidatorTest {

    private static final String SECRET_POR_DEFECTO =
        "dev-secret-change-me-in-prod-this-must-be-32-bytes-or-more";
    private static final String SECRET_VALIDO =
        "una-clave-propia-bien-larga-y-secreta-de-mas-de-32-bytes";

    @Test
    @DisplayName("prod con el secret por defecto corta el arranque")
    void prodConDefectoLanza() {
        JwtSecretValidator validator = new JwtSecretValidator(SECRET_POR_DEFECTO, environment("prod"));

        assertThatThrownBy(() -> validator.run(null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("JWT_SECRET");
    }

    @Test
    @DisplayName("prod con un secret demasiado corto corta el arranque")
    void prodConSecretCortoLanza() {
        JwtSecretValidator validator = new JwtSecretValidator("corto", environment("prod"));

        assertThatThrownBy(() -> validator.run(null))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("prod con un secret valido arranca sin problemas")
    void prodConSecretValidoNoLanza() {
        JwtSecretValidator validator = new JwtSecretValidator(SECRET_VALIDO, environment("prod"));

        assertThatNoException().isThrownBy(() -> validator.run(null));
    }

    @Test
    @DisplayName("en dev el secret por defecto solo avisa, no corta el arranque")
    void devConDefectoNoLanza() {
        JwtSecretValidator validator = new JwtSecretValidator(SECRET_POR_DEFECTO, environment("dev"));

        assertThatNoException().isThrownBy(() -> validator.run(null));
    }

    private Environment environment(String... perfiles) {
        Environment environment = mock(Environment.class);
        when(environment.getActiveProfiles()).thenReturn(perfiles);
        return environment;
    }
}
