package pe.edu.utec.queueless.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.AuthResponse;
import pe.edu.utec.queueless.auth.dto.LoginRequest;
import pe.edu.utec.queueless.auth.dto.RefreshTokenRequest;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.shared.exception.DuplicateResourceException;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.event.UsuarioRegistradoEvent;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;
import pe.edu.utec.queueless.usuario.service.PerfilService;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final AuthenticationManager authenticationManager;
    private final PerfilService perfilService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Ya existe un usuario con ese correo");
        }

        Usuario usuario = Usuario.builder()
            .email(request.getEmail())
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .nombreCompleto(request.getNombreCompleto())
            .activo(true)
            .roles(request.getRoles())
            .build();
        usuario = usuarioRepository.save(usuario);

        perfilService.crearPerfilesParaRoles(usuario, usuario.getRoles());

        eventPublisher.publishEvent(new UsuarioRegistradoEvent(usuario.getId()));
        return buildResponse(usuario);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail()).orElseThrow();
        return buildResponse(usuario);
    }

    /**
     * Emite un par nuevo de tokens a partir de un refresh válido. Cualquier
     * desvío (firma inválida, token expirado, tipo {@code access} usado como
     * refresh, usuario inexistente o desactivado) se traduce a
     * {@link BadCredentialsException} para que el handler global devuelva 401.
     */
    public AuthResponse refresh(RefreshTokenRequest request) {
        Claims claims;
        try {
            claims = jwtService.parseClaims(request.getRefreshToken());
        } catch (JwtException | IllegalArgumentException ex) {
            throw new BadCredentialsException("Refresh token inválido");
        }
        if (!JwtService.TYPE_REFRESH.equals(claims.get(JwtService.CLAIM_TYPE))) {
            throw new BadCredentialsException("Refresh token inválido");
        }
        Usuario usuario = usuarioRepository.findByEmail(claims.getSubject())
            .orElseThrow(() -> new BadCredentialsException("Refresh token inválido"));
        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            throw new BadCredentialsException("Refresh token inválido");
        }
        return buildResponse(usuario);
    }

    private AuthResponse buildResponse(Usuario usuario) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(usuario.getEmail());
        String accessToken = jwtService.generateAccessToken(userDetails, usuario.getId(), usuario.getRoles());
        String refreshToken = jwtService.generateRefreshToken(userDetails);
        return AuthResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .usuarioId(usuario.getId())
            .email(usuario.getEmail())
            .nombreCompleto(usuario.getNombreCompleto())
            .roles(usuario.getRoles())
            .build();
    }
}
