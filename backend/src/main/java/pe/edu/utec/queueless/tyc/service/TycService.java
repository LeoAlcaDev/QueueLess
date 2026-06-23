package pe.edu.utec.queueless.tyc.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.tyc.dto.TycEstadoResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.time.Instant;

/**
 * Registra y lee la aceptación de los Términos y Condiciones de un usuario, con la versión
 * y la fecha. Solo deja constancia: no obliga a aceptar ni bloquea ninguna operación. La
 * versión vigente sale de configuración, la misma que declara el documento. Ver ADR-0030.
 */
@Service
@RequiredArgsConstructor
public class TycService {

    private final UsuarioRepository usuarioRepository;

    @Value("${queueless.tyc.version-vigente}")
    private String versionVigente;

    @Transactional(readOnly = true)
    public TycEstadoResponse verEstado(String email) {
        return TycEstadoResponse.de(buscar(email), versionVigente);
    }

    @Transactional
    public TycEstadoResponse aceptar(String email) {
        Usuario usuario = buscar(email);
        usuario.setTycVersionAceptada(versionVigente);
        usuario.setTycAceptadoAt(Instant.now());
        usuarioRepository.save(usuario);
        return TycEstadoResponse.de(usuario, versionVigente);
    }

    private Usuario buscar(String email) {
        return usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario con email " + email));
    }
}
