package pe.edu.utec.queueless.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.auth.service.JwtService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.usuario.entity.Rol;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests del endpoint /api/auth/refresh contra un Postgres real: el caso feliz
 * (devuelve un par nuevo) y los errores (refresh expirado, mal formado o ausente).
 * La rotación es soft (ver ADR-0020): el refresh anterior sigue siendo válido
 * criptográficamente hasta su expiración natural, así que eso no se testea.
 */
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class RefreshControllerIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthService authService;

    @Value("${queueless.jwt.secret}")
    private String secret;

    @Value("${queueless.jwt.issuer}")
    private String issuer;

    @Test
    @DisplayName("un refresh token valido devuelve un par nuevo (200)")
    void shouldReturnNewTokensWhenRefreshTokenIsValid() throws Exception {
        String refreshToken = registrarYObtenerRefresh();

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    @DisplayName("un refresh token expirado devuelve 401")
    void shouldReturn401WhenRefreshTokenIsExpired() throws Exception {
        String expirado = generarRefreshExpirado("expira@utec.edu.pe");

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + expirado + "\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("un refresh token mal formado devuelve 401")
    void shouldReturn401WhenRefreshTokenIsMalformed() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"esto-no-es-un-jwt\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("un refresh token ausente devuelve 400 por validacion")
    void shouldReturn400WhenRefreshTokenIsMissing() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    private String registrarYObtenerRefresh() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("refresh-" + UUID.randomUUID() + "@utec.edu.pe");
        request.setPassword("password123");
        request.setNombreCompleto("Refresh IT");
        request.setRoles(new HashSet<>(Set.of(Rol.CLIENTE)));
        return authService.register(request).getRefreshToken();
    }

    /**
     * Construye un refresh firmado con el mismo secret de la app pero con
     * expiración en el pasado, usando un JwtService desechable. Así la firma es
     * válida pero el token está vencido, y el endpoint debe responder 401.
     */
    private String generarRefreshExpirado(String email) {
        JwtService desechable = new JwtService();
        ReflectionTestUtils.setField(desechable, "secret", secret);
        ReflectionTestUtils.setField(desechable, "accessExpirationMs", 900_000L);
        ReflectionTestUtils.setField(desechable, "refreshExpirationMs", -1_000L);
        ReflectionTestUtils.setField(desechable, "issuer", issuer);
        UserDetails ud = User.withUsername(email).password("x").authorities("ROLE_CLIENTE").build();
        return desechable.generateRefreshToken(ud);
    }
}
