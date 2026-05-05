package pe.edu.utec.queueless.usuario.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);
}
