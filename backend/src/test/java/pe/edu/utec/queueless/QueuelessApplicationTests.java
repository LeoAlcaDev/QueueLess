package pe.edu.utec.queueless;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;

@SpringBootTest
@ActiveProfiles("test")
class QueuelessApplicationTests extends AbstractIntegrationTest {

    @Test
    void contextLoads() {
        // Arranca todo el contexto de Spring para validar la configuración global.
    }
}
