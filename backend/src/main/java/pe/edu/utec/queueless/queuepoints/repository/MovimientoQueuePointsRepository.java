package pe.edu.utec.queueless.queuepoints.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;

import java.util.List;
import java.util.Optional;

public interface MovimientoQueuePointsRepository extends JpaRepository<MovimientoQueuePoints, Long> {

    /** Historial ordenado del más reciente al más antiguo; id como desempate para timestamps iguales. */
    List<MovimientoQueuePoints> findByUsuarioIdOrderByCreatedAtDescIdDesc(Long usuarioId);

    /**
     * SELECT FOR UPDATE sobre el movimiento más reciente del usuario: serializa
     * canjes concurrentes sin cargar toda la tabla ni afectar el orden del historial.
     * Si el usuario no tiene movimientos devuelve vacío (el saldo es 0 y el canje
     * fallará por saldo insuficiente, por lo que no se necesita el lock).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MovimientoQueuePoints> findFirstByUsuarioIdOrderByIdDesc(Long usuarioId);

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
