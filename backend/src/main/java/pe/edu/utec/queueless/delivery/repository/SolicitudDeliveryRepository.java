package pe.edu.utec.queueless.delivery.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SolicitudDeliveryRepository extends JpaRepository<SolicitudDelivery, Long> {
    List<SolicitudDelivery> findByEstado(EstadoSolicitudDelivery estado);

    /** Para el job de timeout de búsquedas. */
    List<SolicitudDelivery> findByEstadoAndBusquedaFinAtBefore(
        EstadoSolicitudDelivery estado, Instant cutoff);

    List<SolicitudDelivery> findByRepartidorIdOrderByAsignadoAtDesc(Long repartidorId);

    Optional<SolicitudDelivery> findByPedidoId(Long pedidoId);
}
