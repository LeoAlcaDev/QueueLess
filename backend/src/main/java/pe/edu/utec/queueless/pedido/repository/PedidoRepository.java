package pe.edu.utec.queueless.pedido.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    Optional<Pedido> findByCodigo(String codigo);

    List<Pedido> findByClienteIdOrderByCreadoAtDesc(Long clienteId);

    List<Pedido> findByPuntoDeVentaIdAndEstadoIn(Long puntoDeVentaId, List<EstadoPedido> estados);

    /**
     * Cola del comercio: pedidos de cualquiera de sus locales en los estados activos,
     * del más antiguo al más reciente (se atienden en orden de llegada).
     */
    List<Pedido> findByPuntoDeVentaIdInAndEstadoInOrderByCreadoAtAsc(
        Collection<Long> puntoDeVentaIds, Collection<EstadoPedido> estados);

    /** Para el job de expiración de pedidos no recogidos. */
    List<Pedido> findByEstadoAndListoAtBefore(EstadoPedido estado, Instant cutoff);
}
