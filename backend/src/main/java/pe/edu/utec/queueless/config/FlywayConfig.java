package pe.edu.utec.queueless.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Estrategia de arranque de Flyway: {@code repair()} antes de {@code migrate()}.
 *
 * <p>Motivo: editar una migración YA aplicada (aunque solo se toquen comentarios
 * o banners, sin cambiar el DDL) altera su checksum. Al arrancar contra la RDS de
 * prod —que conserva el checksum original en {@code flyway_schema_history}— la
 * validación falla, el proceso sale con código 1 y el contenedor reinicia en bucle
 * sin llegar nunca a estado sano. Perseguir el checksum exacto a mano es frágil y
 * se rompe ante cualquier reedición.
 *
 * <p>{@code repair()} realinea los checksums almacenados con los de los archivos
 * actuales (y limpia entradas de migraciones fallidas) SIN volver a ejecutar el
 * DDL ni tocar el esquema. Luego {@code migrate()} aplica las migraciones
 * realmente pendientes; con {@code spring.flyway.out-of-order=true} esto incluye
 * versiones menores a una ya aplicada (p. ej. V6..V10 frente a V99).
 *
 * <p>En perfiles con base efímera (dev/test con Testcontainers) el repair es
 * prácticamente un no-op, por lo que el bean es seguro en todos los perfiles.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy repairBeforeMigrate() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}
