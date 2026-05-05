package pe.edu.utec.queueless.usuario.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.usuario.entity.PerfilCliente;

public interface PerfilClienteRepository extends JpaRepository<PerfilCliente, Long> {
}
