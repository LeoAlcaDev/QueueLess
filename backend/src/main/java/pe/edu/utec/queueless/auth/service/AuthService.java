package pe.edu.utec.queueless.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
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

        UserDetails userDetails = userDetailsService.loadUserByUsername(usuario.getEmail());
        String accessToken = jwtService.generateAccessToken(userDetails, usuario.getId(), usuario.getRoles());
        String refreshToken = jwtService.generateRefreshToken(userDetails);
        return buildResponse(accessToken, refreshToken, usuario);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail()).orElseThrow();
        UserDetails userDetails = userDetailsService.loadUserByUsername(usuario.getEmail());
        String accessToken = jwtService.generateAccessToken(userDetails, usuario.getId(), usuario.getRoles());
        String refreshToken = jwtService.generateRefreshToken(userDetails);
        return buildResponse(accessToken, refreshToken, usuario);
    }

    /**
     * Renueva el par de tokens a partir de un refresh válido. Recarga los roles
     * desde la base, así un cambio de rol se refleja en el access nuevo. Un token
     * inválido, expirado o que no sea de tipo refresh responde 401 (lo mapea el
     * handler global desde BadCredentialsException).
     */
    public AuthResponse refresh(RefreshTokenRequest request) {
        Claims claims;
        try {
            claims = jwtService.parseClaims(request.getRefreshToken());
        } catch (JwtException ex) {
            throw new BadCredentialsException("Refresh token invalido o expirado");
        }
        if (!JwtService.TYPE_REFRESH.equals(claims.get(JwtService.CLAIM_TYPE))) {
            throw new BadCredentialsException("El token enviado no es un refresh token");
        }
        Usuario usuario = usuarioRepository.findByEmail(claims.getSubject())
            .orElseThrow(() -> new BadCredentialsException("Refresh token invalido o expirado"));
        UserDetails userDetails = userDetailsService.loadUserByUsername(usuario.getEmail());
        String accessToken = jwtService.generateAccessToken(userDetails, usuario.getId(), usuario.getRoles());
        String refreshToken = jwtService.generateRefreshToken(userDetails);
        return buildResponse(accessToken, refreshToken, usuario);
    }

    private AuthResponse buildResponse(String accessToken, String refreshToken, Usuario usuario) {
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
