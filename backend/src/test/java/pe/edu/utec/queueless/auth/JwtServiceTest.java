package pe.edu.utec.queueless.auth;

import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.auth.service.JwtService;
import pe.edu.utec.queueless.usuario.entity.Rol;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests unitarios de JwtService: verifican que el access lleva uid, roles y
 * tipo legibles, que el refresh va marcado como tal, y que un token expirado se
 * rechaza al parsearlo. Sin Spring; las propiedades se inyectan con reflexión.
 */
class JwtServiceTest {

    private JwtService jwtService;

    private final UserDetails usuario = User.withUsername("camila@utec.edu.pe")
        .password("irrelevante")
        .authorities("ROLE_CLIENTE")
        .build();

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", "clave-de-prueba-para-jwt-con-mas-de-32-bytes-seguro");
        ReflectionTestUtils.setField(jwtService, "accessExpirationMs", 900_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpirationMs", 2_592_000_000L);
        ReflectionTestUtils.setField(jwtService, "issuer", "queueless-test");
    }

    @Test
    @DisplayName("el access token expone el uid y los roles del usuario")
    void shouldExtractUidAndRolesFromAccessToken() {
        // Arrange & Act
        String token = jwtService.generateAccessToken(usuario, 42L, Set.of(Rol.CLIENTE, Rol.REPARTIDOR));

        // Assert
        assertThat(jwtService.extractUserId(token)).isEqualTo(42L);
        assertThat(jwtService.extractRoles(token)).containsExactlyInAnyOrder("CLIENTE", "REPARTIDOR");
    }

    @Test
    @DisplayName("el access token va marcado con tipo access")
    void shouldMarkAccessTokenWithTypeAccess() {
        String token = jwtService.generateAccessToken(usuario, 1L, Set.of(Rol.CLIENTE));

        assertThat(jwtService.extractTokenType(token)).isEqualTo("access");
    }

    @Test
    @DisplayName("el refresh token va marcado con tipo refresh y sin roles")
    void shouldMarkRefreshTokenWithTypeRefresh() {
        String token = jwtService.generateRefreshToken(usuario);

        assertThat(jwtService.extractTokenType(token)).isEqualTo("refresh");
        assertThat(jwtService.extractRoles(token)).isEmpty();
    }

    @Test
    @DisplayName("un access token vencido se rechaza al parsearlo")
    void shouldRejectExpiredAccessTokenWhenParsing() {
        // Arrange: expiración en el pasado para forzar el vencimiento
        ReflectionTestUtils.setField(jwtService, "accessExpirationMs", -1_000L);
        String vencido = jwtService.generateAccessToken(usuario, 1L, Set.of(Rol.CLIENTE));

        // Act & Assert
        assertThatThrownBy(() -> jwtService.parseClaims(vencido))
            .isInstanceOf(ExpiredJwtException.class);
    }
}
