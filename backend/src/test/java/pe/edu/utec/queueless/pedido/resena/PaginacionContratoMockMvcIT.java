package pe.edu.utec.queueless.pedido.resena;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifica de punta a punta el contrato de paginación de los endpoints de lista
 * (ADR-0023): la respuesta viaja como ApiResponse con la lista en data.content y
 * la metadata de página, el tamaño por defecto es 20 y el máximo es 100.
 *
 * <p>Usa el listado público de reseñas (no requiere autenticación) y ni siquiera
 * necesita filas: el campo size de la página refleja el tamaño pedido —ya
 * recortado por la config— aunque el contenido venga vacío.
 */
@ActiveProfiles("test")
@AutoConfigureMockMvc
class PaginacionContratoMockMvcIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("sin parámetros usa el tamaño por defecto (20) y la lista viaja en data.content")
    void shouldUseDefaultPageSizeWhenNoParams() throws Exception {
        mockMvc.perform(get("/api/v1/puntos-de-venta/999/resenas"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.page").value(0))
            .andExpect(jsonPath("$.data.size").value(20))
            .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("respeta el tamaño pedido cuando está dentro del tope")
    void shouldHonorRequestedPageSizeWithinCap() throws Exception {
        mockMvc.perform(get("/api/v1/puntos-de-venta/999/resenas").param("size", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.size").value(5));
    }

    @Test
    @DisplayName("un tamaño mayor al máximo se recorta a 100")
    void shouldCapPageSizeAtMax() throws Exception {
        mockMvc.perform(get("/api/v1/puntos-de-venta/999/resenas").param("size", "500"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.size").value(100));
    }
}
