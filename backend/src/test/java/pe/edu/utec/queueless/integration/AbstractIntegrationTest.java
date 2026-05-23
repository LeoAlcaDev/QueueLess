package pe.edu.utec.queueless.integration;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Clase base para tests de integración. Levanta un Postgres real en un
 * contenedor y conecta Spring Boot a él. Hereda de aquí para tests *IT.java.
 *
 * <p>Usa el patrón de contenedor singleton: se inicia una sola vez al cargar
 * la clase y se mantiene vivo durante toda la suite, así varios IT pueden
 * compartir la misma base sin que TestContainers la apague entre clases.
 * El proceso Ryuk de TestContainers se encarga de la limpieza al terminar
 * la JVM.
 */
@SpringBootTest
public abstract class AbstractIntegrationTest {

    static final PostgreSQLContainer<?> POSTGRES =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("queueless_test")
            .withUsername("test")
            .withPassword("test");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
