package pe.edu.utec.queueless.usuario.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.usuario.entity.PerfilRepartidor;

import java.util.List;

public interface PerfilRepartidorRepository extends JpaRepository<PerfilRepartidor, Long> {
    List<PerfilRepartidor> findByDisponibleTrue();
}
