package pe.edu.utec.queueless.delivery.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SolicitudDeliveryRepository extends JpaRepository<SolicitudDelivery, Long> {
    List<SolicitudDelivery> findByEstado(EstadoSolicitudDelivery estado);

    /** SELECT FOR UPDATE: garantiza que solo un repartidor pueda aceptar la solicitud. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SolicitudDelivery s WHERE s.id = :id")
    Optional<SolicitudDelivery> findByIdForUpdate(@Param("id") Long id);

    /** Para el job de timeout de búsquedas. */
    List<SolicitudDelivery> findByEstadoAndBusquedaFinAtBefore(
        EstadoSolicitudDelivery estado, Instant cutoff);

    List<SolicitudDelivery> findByRepartidorIdOrderByAsignadoAtDesc(Long repartidorId);

    Optional<SolicitudDelivery> findByPedidoId(Long pedidoId);
}
