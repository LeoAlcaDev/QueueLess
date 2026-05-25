package pe.edu.utec.queueless.pago.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.pago.entity.Pago;

import java.util.Optional;

public interface PagoRepository extends JpaRepository<Pago, Long> {
    Optional<Pago> findByReferenciaExterna(String referenciaExterna);
    Optional<Pago> findByPedidoId(Long pedidoId);
    boolean existsByPedidoId(Long pedidoId);
}
