package pe.edu.utec.queueless.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests del controlador de autenticacion con MockMvc contra un Postgres real:
 * registro, login y los errores que devuelve (validacion, duplicado, credenciales).
 */
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class AuthControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String REGISTRO = """
        {"email":"%s","password":"password123","nombreCompleto":"Usuario Test","roles":["CLIENTE"]}""";

    @Test
    @DisplayName("registrar un usuario valido devuelve 201 y los tokens")
    void shouldRegisterAndReturnTokensWhenValid() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(REGISTRO.formatted("nuevo@utec.edu.pe")))
            .andExpect(status().isCreated())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
            .andExpect(jsonPath("$.data.email").value("nuevo@utec.edu.pe"));
    }

    @Test
    @DisplayName("registrar con correo invalido devuelve 400")
    void shouldReturn400WhenEmailInvalid() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(REGISTRO.formatted("no-es-correo")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("registrar un correo ya usado devuelve 409")
    void shouldReturn409WhenEmailDuplicated() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(REGISTRO.formatted("repetido@utec.edu.pe")))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(REGISTRO.formatted("repetido@utec.edu.pe")))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("login con credenciales correctas devuelve 200 y los tokens")
    void shouldLoginAndReturnTokensWhenCredentialsValid() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(REGISTRO.formatted("login.ok@utec.edu.pe")))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"login.ok@utec.edu.pe\",\"password\":\"password123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    @DisplayName("login con contraseña incorrecta devuelve 401")
    void shouldReturn401WhenPasswordWrong() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(REGISTRO.formatted("login.bad@utec.edu.pe")))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"login.bad@utec.edu.pe\",\"password\":\"incorrecta\"}"))
            .andExpect(status().isUnauthorized());
    }
}
