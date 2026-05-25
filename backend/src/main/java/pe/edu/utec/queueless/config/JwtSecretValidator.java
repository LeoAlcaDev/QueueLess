package pe.edu.utec.queueless.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * Valida al arrancar que el secret de JWT sea seguro en producción. Si el perfil
 * activo incluye prod y el secret está vacío, es el valor de ejemplo que viene en el
 * repositorio, o tiene menos de 32 bytes (el mínimo para el algoritmo de firma), corta
 * el arranque con un mensaje que dice qué configurar. En otros perfiles solo deja un
 * aviso si el secret sigue siendo el de ejemplo.
 *
 * <p>Corre como ApplicationRunner —no en la construcción de un bean— para validar una
 * vez que el contexto está completo y el perfil activo ya está resuelto.
 */
@Slf4j
@Component
public class JwtSecretValidator implements ApplicationRunner {

    private static final String SECRET_POR_DEFECTO =
        "dev-secret-change-me-in-prod-this-must-be-32-bytes-or-more";
    private static final int BYTES_MINIMOS = 32;

    private final String secret;
    private final Environment environment;

    public JwtSecretValidator(
            @Value("${queueless.jwt.secret}") String secret,
            Environment environment) {
        this.secret = secret;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!esProduccion()) {
            if (esPorDefecto()) {
                log.warn("queueless.jwt.secret tiene el valor de ejemplo; no lo uses en produccion");
            }
            return;
        }
        if (esInseguro()) {
            throw new IllegalStateException(
                "JWT_SECRET inseguro en produccion. Configura un secret propio de al menos "
                + BYTES_MINIMOS + " bytes (distinto del valor de ejemplo). "
                + "Podes generar uno con: openssl rand -base64 48");
        }
    }

    private boolean esProduccion() {
        return Arrays.stream(environment.getActiveProfiles())
            .anyMatch(perfil -> perfil.toLowerCase().contains("prod"));
    }

    private boolean esPorDefecto() {
        return SECRET_POR_DEFECTO.equals(secret);
    }

    private boolean esInseguro() {
        if (secret == null || secret.isBlank()) {
            return true;
        }
        if (esPorDefecto()) {
            return true;
        }
        return secret.getBytes(StandardCharsets.UTF_8).length < BYTES_MINIMOS;
    }
}
