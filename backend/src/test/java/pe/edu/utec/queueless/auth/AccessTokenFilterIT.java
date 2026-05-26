package pe.edu.utec.queueless.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.AuthResponse;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.usuario.entity.Rol;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifica el filtro JWT con un token real (no @WithMockUser, que lo saltearía):
 * que arme las autoridades a partir del claim roles y que solo el access autentica.
 */
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class AccessTokenFilterIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthService authService;

    private String accessToken;
    private String refreshToken;

    @BeforeEach
    void setUp() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("filtro-" + UUID.randomUUID() + "@utec.edu.pe");
        request.setPassword("password123");
        request.setNombreCompleto("Filtro IT");
        request.setRoles(new HashSet<>(Set.of(Rol.CLIENTE)));
        AuthResponse tokens = authService.register(request);
        accessToken = tokens.getAccessToken();
        refreshToken = tokens.getRefreshToken();
    }

    @Test
    @DisplayName("un access token valido autoriza el endpoint de su rol (200)")
    void shouldGrantRoleFromClaimWhenAccessTokenValid() throws Exception {
        mockMvc.perform(get("/api/v1/cliente/pedidos")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("un access token de cliente no entra a un endpoint de comercio (403)")
    void shouldDenyOtherRoleWhenAccessTokenValid() throws Exception {
        mockMvc.perform(get("/api/v1/comercio/pedidos/cola")
                .header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("un refresh token usado como Bearer no autentica (403)")
    void shouldRejectRefreshTokenUsedAsAccess() throws Exception {
        mockMvc.perform(get("/api/v1/cliente/pedidos")
                .header("Authorization", "Bearer " + refreshToken))
            .andExpect(status().isForbidden());
    }
}
