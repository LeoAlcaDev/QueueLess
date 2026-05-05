package pe.edu.utec.queueless.queuepoints.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;

import java.util.List;

public interface MovimientoQueuePointsRepository extends JpaRepository<MovimientoQueuePoints, Long> {
    List<MovimientoQueuePoints> findByUsuarioIdOrderByCreatedAtDesc(Long usuarioId);
}
