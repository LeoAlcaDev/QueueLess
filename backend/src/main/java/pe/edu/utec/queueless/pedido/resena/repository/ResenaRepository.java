package pe.edu.utec.queueless.pedido.resena.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.pedido.resena.entity.ObjetivoResena;
import pe.edu.utec.queueless.pedido.resena.entity.Resena;

public interface ResenaRepository extends JpaRepository<Resena, Long> {

    /** Reseñas del objetivo (local o repartidor), de la más nueva a la más vieja; el id desempata. */
    Page<Resena> findByObjetivoTipoAndObjetivoIdOrderByCreatedAtDescIdDesc(
        ObjetivoResena tipo, Long objetivoId, Pageable pageable);

    /**
     * Para validar que no exista ya una reseña sobre el mismo objetivo en el
     * mismo pedido (el schema lo refuerza con un UNIQUE (pedido_id, objetivo_tipo)).
     */
    boolean existsByPedidoIdAndObjetivoTipo(Long pedidoId, ObjetivoResena objetivoTipo);
}
