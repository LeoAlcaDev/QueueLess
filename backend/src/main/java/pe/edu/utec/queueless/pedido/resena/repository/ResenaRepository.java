package pe.edu.utec.queueless.pedido.resena.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.pedido.resena.entity.ObjetivoResena;
import pe.edu.utec.queueless.pedido.resena.entity.Resena;

import java.util.List;

public interface ResenaRepository extends JpaRepository<Resena, Long> {
    List<Resena> findByObjetivoTipoAndObjetivoId(ObjetivoResena tipo, Long objetivoId);
}
