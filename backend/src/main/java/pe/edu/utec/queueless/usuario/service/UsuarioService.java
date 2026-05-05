package pe.edu.utec.queueless.usuario.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;

    public Usuario findById(Long id) {
        return usuarioRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario", id));
    }

    public Usuario findByEmail(String email) {
        return usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario con email " + email));
    }

    @Transactional
    public Usuario activarRol(Long usuarioId, Rol rol) {
        // TODO Semana 1: validar que el rol no esté ya activo, y crear el perfil correspondiente
        Usuario usuario = findById(usuarioId);
        usuario.getRoles().add(rol);
        return usuarioRepository.save(usuario);
    }
}
