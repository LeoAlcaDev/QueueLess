package pe.edu.utec.queueless.auth.jwt;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.edu.utec.queueless.auth.service.JwtService;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Lee el access token del header Authorization y arma la autenticación a partir
 * de sus claims (subject + roles), sin consultar la base. Solo acepta tokens de
 * tipo "access": ignora los refresh y los inválidos. Ver ADR-0020.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(BEARER_PREFIX.length());
        Claims claims;
        try {
            claims = jwtService.parseClaims(jwt);
        } catch (Exception ex) {
            // Token inválido / expirado / mal firmado: dejamos pasar sin auth.
            filterChain.doFilter(request, response);
            return;
        }

        // Solo el access token autentica; un refresh usado como Bearer no.
        boolean esAccess = JwtService.TYPE_ACCESS.equals(claims.get(JwtService.CLAIM_TYPE));
        String email = claims.getSubject();
        if (esAccess && email != null
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(email, null, leerAutoridades(claims));
            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authToken);
        }

        filterChain.doFilter(request, response);
    }

    // Traduce el claim "roles" (nombres) al formato de Spring Security: ROLE_*.
    private List<SimpleGrantedAuthority> leerAutoridades(Claims claims) {
        List<SimpleGrantedAuthority> autoridades = new ArrayList<>();
        Object roles = claims.get(JwtService.CLAIM_ROLES);
        if (roles instanceof List<?> lista) {
            for (Object rol : lista) {
                autoridades.add(new SimpleGrantedAuthority("ROLE_" + rol));
            }
        }
        return autoridades;
    }
}
