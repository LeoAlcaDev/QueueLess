package pe.edu.utec.queueless.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifica que CORS quede integrado en la cadena de Spring Security: un preflight
 * sin token debe resolverse antes de las reglas de rol, así el navegador del
 * frontend no choca con un 403 al pedir permiso para la llamada real.
 */
@ActiveProfiles("test")
@AutoConfigureMockMvc
class CorsMockMvcIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("el preflight de un origen permitido pasa la cadena sin token y responde 200")
    void shouldAllowPreflightFromKnownOriginWithoutToken() throws Exception {
        mockMvc.perform(options("/api/v1/cliente/pedidos")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
