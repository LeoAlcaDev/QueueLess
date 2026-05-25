package pe.edu.utec.queueless.queuepoints.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;

import java.util.List;
import java.util.Optional;

public interface MovimientoQueuePointsRepository extends JpaRepository<MovimientoQueuePoints, Long> {

    List<MovimientoQueuePoints> findByUsuarioIdOrderByCreatedAtDesc(Long usuarioId);

    /**
     * Idempotencia del ledger (ADR-0008): si ya existe un movimiento del mismo
     * tipo para la misma referencia, no se inserta uno nuevo y se devuelve el
     * existente.
     */
    Optional<MovimientoQueuePoints> findFirstByTipoAndReferenciaTipoAndReferenciaId(
        TipoMovimiento tipo, String referenciaTipo, Long referenciaId);

    /**
     * Saldo neto del usuario: suma de GANADO menos suma de CANJEADO.
     *
     * <p>El COALESCE evita null cuando el usuario no tiene movimientos todavía;
     * Postgres devolvería null al hacer SUM sobre cero filas.
     */
    @Query("""
        SELECT COALESCE(SUM(CASE
            WHEN m.tipo = pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento.GANADO   THEN m.monto
            WHEN m.tipo = pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento.CANJEADO THEN -m.monto
            ELSE 0
        END), 0)
        FROM MovimientoQueuePoints m
        WHERE m.usuario.id = :usuarioId
        """)
    Integer calcularSaldo(@Param("usuarioId") Long usuarioId);
}
