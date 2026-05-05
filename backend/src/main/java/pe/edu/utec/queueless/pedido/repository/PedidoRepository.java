package pe.edu.utec.queueless.pedido.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    Optional<Pedido> findByCodigo(String codigo);

    List<Pedido> findByClienteIdOrderByCreadoAtDesc(Long clienteId);

    List<Pedido> findByPuntoDeVentaIdAndEstadoIn(Long puntoDeVentaId, List<EstadoPedido> estados);

    /** Para el job de expiración de pedidos no recogidos. */
    List<Pedido> findByEstadoAndListoAtBefore(EstadoPedido estado, Instant cutoff);
}
