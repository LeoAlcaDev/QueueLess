package pe.edu.utec.queueless.pedido.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    Optional<Pedido> findByCodigo(String codigo);

    /**
     * Trae el pedido con bloqueo de escritura. Lo usan el job de expiración y el
     * cierre de entrega para no pisarse: el segundo en entrar relee la fila ya
     * transicionada y, al re-chequear el estado, no la degrada ni la cierra dos veces.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pedido p WHERE p.id = :id")
    Optional<Pedido> findByIdForUpdate(@Param("id") Long id);

    /** Historial del cliente, del más reciente al más antiguo; el id desempata para una paginación estable. */
    Page<Pedido> findByClienteIdOrderByCreadoAtDescIdDesc(Long clienteId, Pageable pageable);

    List<Pedido> findByPuntoDeVentaIdAndEstadoIn(Long puntoDeVentaId, List<EstadoPedido> estados);

    /**
     * Cola del comercio: pedidos de cualquiera de sus locales en los estados activos,
     * del más antiguo al más reciente (se atienden en orden de llegada).
     */
    List<Pedido> findByPuntoDeVentaIdInAndEstadoInOrderByCreadoAtAsc(
        Collection<Long> puntoDeVentaIds, Collection<EstadoPedido> estados);

    /** Para el job de expiración de pedidos no recogidos. */
    List<Pedido> findByEstadoAndListoAtBefore(EstadoPedido estado, Instant cutoff);

    /** Cuenta los pedidos de un local en un estado. Lo usa el conteo de entregados del tiempo de espera. */
    int countByPuntoDeVentaIdAndEstado(Long puntoDeVentaId, EstadoPedido estado);

    /** Cuenta los pedidos de un local en cualquiera de varios estados. Lo usa el tamaño de la cola del tiempo de espera. */
    int countByPuntoDeVentaIdAndEstadoIn(Long puntoDeVentaId, Collection<EstadoPedido> estados);

    /** Pedidos entregados con sus tiempos completos; alimentan el entrenamiento del modelo de espera. */
    List<Pedido> findByEstadoAndAceptadoAtIsNotNullAndListoAtIsNotNull(EstadoPedido estado);

    /** Para el job que cancela los pedidos abandonados sin pagar. */
    List<Pedido> findByEstadoAndCreadoAtBefore(EstadoPedido estado, Instant cutoff);

    /** Programados en un estado cuya hora de recojo ya pasó; lo usa la red de seguridad. */
    List<Pedido> findByEstadoAndRecojoProgramadoAtBefore(EstadoPedido estado, Instant cutoff);

    /** Todos los pedidos programados de los locales de un gestor; alimentan la tasa de cumplimiento. */
    List<Pedido> findByPuntoDeVentaGestorIdAndRecojoProgramadoAtIsNotNull(Long gestorId);

    /** Instantes de creación de los pedidos pagados de un local desde una fecha; alimentan la curva de ocupación (ADR-0028). */
    @Query("""
        SELECT p.creadoAt FROM Pedido p
        WHERE p.puntoDeVenta.id = :puntoDeVentaId
          AND p.pagadoAt IS NOT NULL
          AND p.creadoAt >= :desde
        """)
    List<Instant> findCreadoAtDePedidosConcretados(@Param("puntoDeVentaId") Long puntoDeVentaId,
                                                   @Param("desde") Instant desde);
}
