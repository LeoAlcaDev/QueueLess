package pe.edu.utec.queueless.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));

        // Mapeamos los roles del enum al formato esperado por Spring Security: ROLE_*
        String[] authorities = usuario.getRoles().stream()
            .map(rol -> "ROLE_" + rol.name())
            .toArray(String[]::new);

        return User.builder()
            .username(usuario.getEmail())
            .password(usuario.getPasswordHash())
            .disabled(!usuario.getActivo())
            .authorities(authorities)
            .build();
    }
}
