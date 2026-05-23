package pe.edu.utec.queueless.usuario.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.dto.UsuarioResponse;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PerfilService perfilService;

    public Usuario findById(Long id) {
        return usuarioRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
    }

    public Usuario findByEmail(String email) {
        return usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario con email " + email));
    }

    /**
     * Activa un rol nuevo para el usuario y crea su perfil vacio. Un rol solo puede
     * activarse una vez: reactivarlo es un error de negocio.
     */
    @Transactional
    public Usuario activarRol(Long usuarioId, Rol rol) {
        Usuario usuario = findById(usuarioId);
        if (usuario.tieneRol(rol)) {
            throw new BusinessRuleException("El usuario ya tiene activo el rol " + rol.name());
        }
        usuario.getRoles().add(rol);
        perfilService.crearPerfilParaRol(usuario, rol);
        return usuarioRepository.save(usuario);
    }

    public UsuarioResponse toResponse(Usuario usuario) {
        return UsuarioResponse.builder()
            .id(usuario.getId())
            .email(usuario.getEmail())
            .nombreCompleto(usuario.getNombreCompleto())
            .roles(usuario.getRoles())
            .build();
    }
}
