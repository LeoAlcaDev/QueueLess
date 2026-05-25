package pe.edu.utec.queueless.pago.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.edu.utec.queueless.pago.entity.Pago;

import java.util.Optional;

public interface PagoRepository extends JpaRepository<Pago, Long> {
    Optional<Pago> findByReferenciaExterna(String referenciaExterna);
    Optional<Pago> findByPedidoId(Long pedidoId);
    boolean existsByPedidoId(Long pedidoId);

    /** Carga el Pago junto con su Pedido y cliente en una sola consulta (evita LazyInitializationException fuera de transacción). */
    @Query("SELECT p FROM Pago p JOIN FETCH p.pedido ped JOIN FETCH ped.cliente WHERE p.id = :id")
    Optional<Pago> findByIdWithPedido(Long id);
}
