package pe.edu.utec.queueless.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import pe.edu.utec.queueless.usuario.entity.Rol;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Generación y validación de tokens JWT (HS256). Emite dos tipos de token: un
 * access corto, que lleva los claims {@code uid}/{@code roles}/{@code type} para
 * que el filtro resuelva la autorización sin tocar la base, y un refresh largo
 * que solo sirve para pedir un par nuevo. Detalles y razones en el ADR-0020.
 */
@Service
public class JwtService {

    public static final String CLAIM_UID = "uid";
    public static final String CLAIM_ROLES = "roles";
    public static final String CLAIM_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    @Value("${queueless.jwt.secret}")
    private String secret;

    @Value("${queueless.jwt.access-expiration-ms}")
    private long accessExpirationMs;

    @Value("${queueless.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    @Value("${queueless.jwt.issuer}")
    private String issuer;

    /**
     * Access token con expiración corta. Lleva el id y los roles del usuario
     * (como nombres) para que el filtro arme la autorización sin consultar la
     * base, y el tipo {@code "access"} para distinguirlo del refresh.
     */
    public String generateAccessToken(UserDetails userDetails, Long userId, Set<Rol> roles) {
        List<String> nombresRoles = new ArrayList<>();
        for (Rol rol : roles) {
            nombresRoles.add(rol.name());
        }
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_UID, userId);
        claims.put(CLAIM_ROLES, nombresRoles);
        claims.put(CLAIM_TYPE, TYPE_ACCESS);
        return construirToken(claims, userDetails.getUsername(), accessExpirationMs);
    }

    /**
     * Refresh token con expiración larga. Es mínimo: subject + tipo
     * {@code "refresh"}. No lleva roles porque no autoriza requests, solo se usa
     * contra /api/auth/refresh para conseguir un par nuevo.
     */
    public String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_TYPE, TYPE_REFRESH);
        return construirToken(claims, userDetails.getUsername(), refreshExpirationMs);
    }

    private String construirToken(Map<String, Object> claims, String subject, long expiracionMs) {
        Date ahora = new Date();
        return Jwts.builder()
            .claims(claims)
            .subject(subject)
            .issuer(issuer)
            .issuedAt(ahora)
            .expiration(new Date(ahora.getTime() + expiracionMs))
            .signWith(getSigningKey())
            .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Long extractUserId(String token) {
        Object uid = parseClaims(token).get(CLAIM_UID);
        // El número puede deserializarse como Integer o Long según su tamaño.
        return uid == null ? null : ((Number) uid).longValue();
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Object roles = parseClaims(token).get(CLAIM_ROLES);
        return roles == null ? List.of() : (List<String>) roles;
    }

    public String extractTokenType(String token) {
        Object tipo = parseClaims(token).get(CLAIM_TYPE);
        return tipo == null ? null : tipo.toString();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isExpired(token);
    }

    private boolean isExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(parseClaims(token));
    }

    /**
     * Parsea y valida la firma del token, devolviendo sus claims. Lanza una
     * {@code JwtException} si la firma es inválida, está mal formado o expiró.
     */
    public Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey getSigningKey() {
        // El secret puede venir como texto plano o como base64; usamos sus bytes UTF-8.
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
