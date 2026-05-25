package pe.edu.utec.queueless.pedido.resena.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.pedido.resena.entity.ObjetivoResena;
import pe.edu.utec.queueless.pedido.resena.entity.Resena;

import java.util.List;

public interface ResenaRepository extends JpaRepository<Resena, Long> {

    List<Resena> findByObjetivoTipoAndObjetivoIdOrderByCreatedAtDesc(
        ObjetivoResena tipo, Long objetivoId);

    /**
     * Para validar que no exista ya una reseña sobre el mismo objetivo en el
     * mismo pedido (el schema lo refuerza con un UNIQUE (pedido_id, objetivo_tipo)).
     */
    boolean existsByPedidoIdAndObjetivoTipo(Long pedidoId, ObjetivoResena objetivoTipo);
}
